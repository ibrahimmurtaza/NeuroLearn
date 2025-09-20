import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const geminiApiKey = process.env.GOOGLE_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const genAI = new GoogleGenerativeAI(geminiApiKey)

interface FlashcardRequest {
  documentIds: string[]
  topic: string
  // userId is now obtained from authentication, not from request body
}

interface Flashcard {
  question: string
  answer: string
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()
const RATE_LIMIT_MAX = 10 // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)
  
  if (!userLimit || now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now })
    return true
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  userLimit.count++
  return true
}

// Extract relevant passages from document content based on topic
function extractRelevantPassages(content: string, topic: string, maxPassages: number = 5): string[] {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const topicWords = topic.toLowerCase().split(/\s+/)
  
  // Score sentences based on topic relevance
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase()
    let score = 0
    
    topicWords.forEach(word => {
      if (lowerSentence.includes(word)) {
        score += 1
      }
    })
    
    // Bonus for longer sentences (more context)
    score += Math.min(sentence.length / 100, 2)
    
    return { sentence: sentence.trim(), score }
  })
  
  // Sort by score and take top passages
  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPassages)
    .map(item => item.sentence)
    .filter(sentence => sentence.length > 0)
}

// Generate flashcards using Gemini
async function generateFlashcards(topic: string, context: string): Promise<Flashcard[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are a flashcard generator.
Topic: ${topic}
Context from selected documents:
${context}

Generate 8-10 flashcards in JSON format with keys:
- question
- answer
Keep questions short and answers concise (max 2 sentences).

Return ONLY a valid JSON array of flashcards, no additional text or formatting.`
  
  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean the response to extract JSON
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '')
    }
    
    const flashcards = JSON.parse(jsonText)
    
    // Validate flashcards format
    if (!Array.isArray(flashcards)) {
      throw new Error('Response is not an array')
    }
    
    return flashcards.filter(card => 
      card && 
      typeof card.question === 'string' && 
      typeof card.answer === 'string' &&
      card.question.trim().length > 0 &&
      card.answer.trim().length > 0
    ).slice(0, 10) // Limit to 10 flashcards
    
  } catch (error) {
    console.error('Error generating flashcards:', error)
    throw new Error('Failed to generate flashcards')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication middleware
    const cookieStore = cookies()
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    const body: FlashcardRequest = await request.json()
    const { documentIds, topic } = body
    // Use authenticated user ID instead of request body userId
    const userId = user.id
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      )
    }
    
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }
    
    // Rate limiting
    const identifier = userId || request.ip || 'anonymous'
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }
    
    // Fetch document contents with user_id filtering for security
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, filename, content, metadata')
      .in('id', documentIds)
      .eq('processing_status', 'completed')
      .eq('user_id', userId)
    
    if (fetchError) {
      console.error('Error fetching documents:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }
    
    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No valid documents found' },
        { status: 404 }
      )
    }
    
    // Extract relevant passages from all documents
    let allRelevantPassages: string[] = []
    
    for (const doc of documents) {
      if (doc.content) {
        const passages = extractRelevantPassages(doc.content, topic, 3)
        allRelevantPassages.push(...passages)
      }
    }
    
    if (allRelevantPassages.length === 0) {
      return NextResponse.json(
        { error: 'No relevant content found for the specified topic' },
        { status: 404 }
      )
    }
    
    // Limit context length to avoid token limits
    const context = allRelevantPassages.slice(0, 8).join('\n\n')
    
    // Generate flashcards
    const flashcards = await generateFlashcards(topic, context)
    
    if (flashcards.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate flashcards from the provided content' },
        { status: 500 }
      )
    }
    
    // Store flashcards in database using the proper flashcard_sets structure
    let flashcardSetId: string | null = null
    if (userId) {
      try {
        // Create flashcard set
        const { data: flashcardSet, error: setError } = await supabase
          .from('flashcard_sets')
          .insert({
            user_id: userId,
            title: `${topic.trim()} - Flashcards`,
            topic: topic.trim(),
            metadata: {
              document_count: documents.length,
              passage_count: allRelevantPassages.length,
              generated_at: new Date().toISOString()
            }
          })
          .select('id')
          .single()
        
        if (setError) {
          console.error('Error creating flashcard set:', setError)
        } else if (flashcardSet) {
          flashcardSetId = flashcardSet.id
          
          // Insert individual flashcards
          const flashcardInserts = flashcards.map((card, index) => ({
            set_id: flashcardSetId,
            question: card.question,
            answer: card.answer,
            order_index: index,
            metadata: {}
          }))
          
          const { error: cardsError } = await supabase
            .from('flashcard_generator_cards')
            .insert(flashcardInserts)
          
          if (cardsError) {
            console.error('Error storing flashcard cards:', cardsError)
          }
          
          // Link documents to flashcard set
          const documentLinks = documentIds.map(docId => ({
            set_id: flashcardSetId,
            document_id: docId
          }))
          
          const { error: docsError } = await supabase
            .from('flashcard_documents')
            .insert(documentLinks)
          
          if (docsError) {
            console.error('Error linking documents to flashcard set:', docsError)
          }
        }
      } catch (storageError) {
        console.error('Error storing flashcards:', storageError)
      }
    }
    
    return NextResponse.json({
      success: true,
      flashcards,
      topic,
      documentCount: documents.length,
      passageCount: allRelevantPassages.length,
      flashcardSetId: flashcardSetId
    })
    
  } catch (error) {
    console.error('Error in flashcard generation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}