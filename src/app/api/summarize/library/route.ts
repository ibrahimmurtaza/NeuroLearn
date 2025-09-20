import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple text similarity function for retrieval
function calculateTextSimilarity(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const queryWord of queryWords) {
    if (contentWords.some(contentWord => 
      contentWord.includes(queryWord) || queryWord.includes(contentWord)
    )) {
      matches++;
    }
  }
  
  return matches / queryWords.length;
}

// Extract relevant passages from document content
function extractRelevantPassages(query: string, content: string, maxPassages: number = 3): string[] {
  const sentences = content.split(/[.!?]+\s+/).filter(s => s.trim().length > 20);
  const scoredSentences = sentences.map(sentence => ({
    sentence: sentence.trim(),
    score: calculateTextSimilarity(query, sentence)
  }));
  
  // Sort by relevance score and take top passages
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPassages * 2) // Get more sentences to form coherent passages
    .map(item => item.sentence);
  
  // Group sentences into coherent passages
  const passages: string[] = [];
  let currentPassage = '';
  
  for (const sentence of topSentences) {
    if (currentPassage.length + sentence.length > 500 && currentPassage.length > 0) {
      passages.push(currentPassage.trim());
      currentPassage = sentence;
    } else {
      currentPassage += (currentPassage ? '. ' : '') + sentence;
    }
    
    if (passages.length >= maxPassages) break;
  }
  
  if (currentPassage.trim() && passages.length < maxPassages) {
    passages.push(currentPassage.trim());
  }
  
  return passages;
}

// Generate AI summary using OpenAI
async function generateAISummary(query: string, relevantContent: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyst. Generate concise, accurate summaries based on the provided content and user query. Focus on the most relevant information.'
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nRelevant Content:\n${relevantContent}\n\nPlease provide a comprehensive summary that directly addresses the query using the provided content. Be specific and cite key information.`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate summary';
  } catch (error) {
    console.error('AI summary generation error:', error);
    return 'Error generating AI summary. Please try again.';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Set up authenticated Supabase client
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, documentIds, language = 'en' } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Retrieve documents from the content column
    let documentsQuery = supabaseAdmin
      .from('documents')
      .select('id, filename, content, created_at')
      .eq('user_id', user.id)
      .not('content', 'is', null)
      .neq('content', '');

    // Filter by specific document IDs if provided
    if (documentIds && documentIds.length > 0) {
      documentsQuery = documentsQuery.in('id', documentIds);
    }

    const { data: documents, error: docError } = await documentsQuery;

    if (docError) {
      console.error('Database error:', docError);
      return NextResponse.json(
        { error: 'Failed to retrieve documents' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found with content' },
        { status: 404 }
      );
    }

    // Perform retrieval-based analysis
    const retrievalResults = [];
    let allRelevantContent = '';

    for (const document of documents) {
      const relevantPassages = extractRelevantPassages(query, document.content);
      
      if (relevantPassages.length > 0) {
        const documentRelevance = {
          documentId: document.id,
          filename: document.filename,
          relevantPassages,
          relevanceScore: relevantPassages.reduce((sum, passage) => 
            sum + calculateTextSimilarity(query, passage), 0
          ) / relevantPassages.length
        };
        
        retrievalResults.push(documentRelevance);
        allRelevantContent += `\n\nFrom "${document.filename}":\n${relevantPassages.join('\n\n')}`;
      }
    }

    // Sort by relevance score
    retrievalResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (retrievalResults.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        summary: 'No relevant content found in the selected documents for your query.',
        retrievalResults: [],
        documentsAnalyzed: documents.length
      });
    }

    // Generate AI-powered summary based on retrieved content
    const aiSummary = await generateAISummary(query, allRelevantContent.trim());

    // Save the query and summary to database
    const { data: summaryRecord, error: summaryError } = await supabaseAdmin
      .from('summaries')
      .insert({
        user_id: user.id,
        title: `Query: ${query.substring(0, 50)}${query.length > 50 ? '...' : ''}`,
        content: aiSummary,
        summary_type: 'medium',
        language,
        source_documents: retrievalResults.map(r => ({ 
          name: r.filename, 
          id: r.documentId,
          relevanceScore: r.relevanceScore 
        })),
        query: query,
        processing_status: 'completed'
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error saving summary:', summaryError);
    }

    return NextResponse.json({
      success: true,
      query,
      summary: aiSummary,
      summaryId: summaryRecord?.id,
      retrievalResults: retrievalResults.slice(0, 5), // Return top 5 most relevant
      documentsAnalyzed: documents.length,
      totalRelevantDocuments: retrievalResults.length
    });

  } catch (error) {
    console.error('Library summarization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Set up authenticated Supabase client
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get recent query-based summaries
    const { data: summaries, error } = await supabaseAdmin
      .from('summaries')
      .select('id, title, content, query, source_documents, created_at')
      .eq('user_id', user.id)
      .not('query', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summaries: summaries || []
    });

  } catch (error) {
    console.error('GET library error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}