import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { GenerateSummaryRequest, GenerateSummaryResponse, SummaryType, ProcessingStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 15,
  delayBetweenRequests: 4000, // 4 seconds
  maxRetries: 3,
  baseDelay: 2000 // 2 seconds
};

// Simple rate limiter
class RateLimiter {
  private requests: number[] = [];
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // Check if we need to wait
    if (this.requests.length >= RATE_LIMIT.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request
    this.requests.push(now);
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.delayBetweenRequests));
  }
}

const rateLimiter = new RateLimiter();

// Summary prompts for different types
const SUMMARY_PROMPTS = {
  short: `Provide a concise summary of the following text in 2-3 sentences. Focus on the main points and key takeaways:\n\n`,
  medium: `Provide a balanced summary of the following text. Include:
- Main themes and arguments
- Key supporting points
- Important details
- Conclusions or recommendations

Text:\n\n`,
  detailed: `Provide a comprehensive and thorough summary of the following text. Include:
- Complete overview of all main themes
- Detailed analysis of key arguments
- Supporting evidence and examples
- Methodology (if applicable)
- Conclusions and implications
- Recommendations or next steps

Text:\n\n`,
  brief: `Provide a very brief summary of the following text in 1-2 sentences. Focus only on the most essential point:\n\n`,
  bullet_points: `Summarize the following text as a list of bullet points. Each point should capture a key idea or important detail:\n\n`,
  executive: `Provide an executive summary of the following text suitable for business leaders. Include:
- Key findings and insights
- Strategic implications
- Actionable recommendations
- Business impact

Text:\n\n`,
  academic: `Provide an academic-style summary of the following text. Include:
- Research objectives and methodology
- Key findings and evidence
- Theoretical implications
- Limitations and future research directions

Text:\n\n`,
  custom: `Provide a comprehensive summary of the following text:\n\n`
};

// Language-specific instructions
const LANGUAGE_INSTRUCTIONS = {
  en: 'Respond in English.',
  es: 'Responde en español.',
  fr: 'Répondez en français.',
  de: 'Antworten Sie auf Deutsch.',
  it: 'Rispondi in italiano.',
  pt: 'Responda em português.',
  ru: 'Отвечайте на русском языке.',
  ja: '日本語で回答してください。',
  ko: '한국어로 답변해 주세요.',
  zh: '请用中文回答。'
};

async function generateSummaryWithAI(
  text: string,
  summaryType: SummaryType,
  language: string = 'en',
  documentTitle?: string
): Promise<string> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
    try {
      // Apply rate limiting
      await rateLimiter.waitIfNeeded();
      
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Truncate content if too long (max ~30k chars to stay within token limits)
      const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '...' : text;
      
      const prompt = SUMMARY_PROMPTS[summaryType];
      const languageInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;
      const titleInstruction = documentTitle ? `Start your summary with the document title "${documentTitle}" for proper attribution and context.\n\n` : '';
      const fullPrompt = `${languageInstruction}\n\n${titleInstruction}${prompt}${documentTitle ? `\n\nDocument Title: ${documentTitle}\n\nDocument Content:\n` : ''}${truncatedText}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      lastError = error;
      console.error(`AI generation error (attempt ${attempt}):`, error);
      
      // Check if it's a quota/rate limit error
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
        if (attempt < RATE_LIMIT.maxRetries) {
          const delay = RATE_LIMIT.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Rate limit hit, waiting ${delay}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error('Google Gemini API quota exceeded. Please try again later.');
        }
      }
      
      // For other errors, don't retry
      throw new Error('Failed to generate summary with AI');
    }
  }
  
  throw lastError || new Error('Failed to generate summary after all retries');
}

async function generateKeyPoints(text: string, language: string = 'en'): Promise<string[]> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
    try {
      // Apply rate limiting
      await rateLimiter.waitIfNeeded();
      
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const languageInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;
      
      // Truncate content if too long
      const truncatedText = text.length > 30000 ? text.substring(0, 30000) + '...' : text;
      
      const prompt = `${languageInstruction}\n\nExtract 5-8 key points from the following text. Return them as a simple list, one point per line, without numbering or bullet points:\n\n${truncatedText}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const keyPointsText = response.text();
      
      return keyPointsText
        .split('\n')
        .map(point => point.trim())
        .filter(point => point.length > 0)
        .slice(0, 8); // Limit to 8 key points
    } catch (error: any) {
      lastError = error;
      console.error(`Key points generation error (attempt ${attempt}):`, error);
      
      // Check if it's a quota/rate limit error
      if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
        if (attempt < RATE_LIMIT.maxRetries) {
          const delay = RATE_LIMIT.baseDelay * Math.pow(2, attempt - 1);
          console.log(`Rate limit hit for key points, waiting ${delay}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error('Key points generation failed due to quota limits, returning empty array');
          return [];
        }
      }
      
      // For other errors, return empty array
      console.error('Key points generation failed:', error);
      return [];
    }
  }
  
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSummaryRequest = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    const { documentId, summaryType, language = 'en', userId } = body;
    console.log('Extracted values:', { documentId, summaryType, language, userId });

    // Input validation
    if (!documentId || !summaryType || !userId) {
      console.log('Validation failed:', { 
        documentId: !!documentId, 
        summaryType: !!summaryType, 
        userId: !!userId 
      });
      return NextResponse.json(
        { error: 'Document ID, summary type, and user ID are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for documentId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format. Expected UUID.' },
        { status: 400 }
      );
    }

    // Validate summary type
    const validSummaryTypes = ['short', 'medium', 'detailed', 'brief', 'bullet_points', 'executive', 'academic', 'custom'];
    if (!validSummaryTypes.includes(summaryType)) {
      return NextResponse.json(
        { error: 'Invalid summary type. Must be one of: short, medium, detailed, brief, bullet_points, executive, academic, custom' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    if (language && !validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      );
    }



    // Fetch document
    console.log('Fetching document with ID:', documentId, 'for user:', userId);
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    console.log('Document fetch result:', { document: !!document, error: docError });
    if (docError || !document) {
      console.log('Document not found. Error:', docError);
      return NextResponse.json(
        { 
          error: 'Document not found', 
          details: 'The specified document does not exist or you do not have permission to access it.',
          code: 'DOCUMENT_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Check if summary already exists for this type
    const { data: existingSummary } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_type', summaryType)
      .eq('language', language)
      .single();

    if (existingSummary) {
      return NextResponse.json({
        success: true,
        summary: {
          id: existingSummary.id,
          documentId: documentId,
          summaryType: existingSummary.summary_type,
          content: existingSummary.content,
          keyPoints: [],
          language: existingSummary.language,
          wordCount: existingSummary.content ? existingSummary.content.split(/\s+/).length : 0,
          processingStatus: 'ready',
          createdAt: existingSummary.created_at,
          updatedAt: existingSummary.updated_at
        }
      });
    }

    // Create new summary record
    const summaryId = uuidv4();
    const { error: createError } = await supabase
      .from('summaries')
      .insert({
        id: summaryId,
        user_id: userId,
        title: `${summaryType} summary`,
        content: '',
        summary_type: summaryType,
        language: language || 'en'
      });

    if (createError) {
      console.error('Error creating summary record:', createError);
      return NextResponse.json(
        { error: 'Failed to create summary' },
        { status: 500 }
      );
    }

    try {
      // Extract text content from document metadata
      const documentContent = document.metadata?.textContent || '';
      
      if (!documentContent) {
        console.error('No text content found in document metadata');
        return NextResponse.json(
          { error: 'Document has no extractable text content' },
          { status: 400 }
        );
      }

      console.log('Document content length:', documentContent.length);
      console.log('Document content preview:', documentContent.substring(0, 200));
      
      // Generate summary content
      console.log('Starting AI summary generation...');
      const summaryContent = await generateSummaryWithAI(
        documentContent,
        summaryType,
        language,
        document.filename
      );
      console.log('Summary generated, length:', summaryContent.length);
      console.log('Summary content preview:', summaryContent.substring(0, 200));

      // Generate key points
      console.log('Starting key points generation...');
      const keyPoints = await generateKeyPoints(documentContent, language);
      console.log('Key points generated:', keyPoints.length, 'points');

      // Update summary with generated content
      const { data: updatedSummary, error: updateError } = await supabase
        .from('summaries')
        .update({
          content: summaryContent
        })
        .eq('id', summaryId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating summary:', updateError);
        return NextResponse.json(
          { error: 'Failed to update summary' },
          { status: 500 }
        );
      }

      // Summary created successfully

      const response: GenerateSummaryResponse = {
        success: true,
        summary: {
          id: updatedSummary.id,
          documentId: documentId,
          summaryType: updatedSummary.summary_type,
          content: updatedSummary.content,
          keyPoints: keyPoints || [],
          language: updatedSummary.language,
          wordCount: summaryContent.split(/\s+/).length,
          processingStatus: 'ready',
          createdAt: updatedSummary.created_at,
          updatedAt: updatedSummary.updated_at
        }
      };

      return NextResponse.json(response);

    } catch (aiError) {
      // Log AI processing error
      console.error('AI processing error:', aiError);
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');
    const summaryType = searchParams.get('summaryType');
    const language = searchParams.get('language');

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and user ID are required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (summaryType) {
      query = query.eq('summary_type', summaryType);
    }

    if (language) {
      query = query.eq('language', language);
    }

    const { data: summaries, error } = await query;

    if (error) {
      console.error('Error fetching summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summaries: summaries || []
    });

  } catch (error) {
    console.error('Get summaries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { summaryId, content, keyPoints, userId } = body;

    if (!summaryId || !userId) {
      return NextResponse.json(
        { error: 'Summary ID and user ID are required' },
        { status: 400 }
      );
    }

    const { data: updatedSummary, error: updateError } = await supabase
        .from('summaries')
        .update({
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', summaryId)
        .eq('user_id', userId)
        .select()
        .single();

    if (updateError) {
      console.error('Error updating summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to update summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: {
        id: updatedSummary.id,
        documentId: null,
        summaryType: updatedSummary.summary_type,
        content: updatedSummary.content,
        keyPoints: [],
        language: updatedSummary.language,
        wordCount: updatedSummary.content ? updatedSummary.content.split(/\s+/).length : 0,
        processingStatus: 'ready',
        createdAt: updatedSummary.created_at,
        updatedAt: updatedSummary.updated_at
      }
    });

  } catch (error) {
    console.error('Update summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { summaryId, userId } = body;

    if (!summaryId || !userId) {
      return NextResponse.json(
        { error: 'Summary ID and user ID are required' },
        { status: 400 }
      );
    }

    // Delete the summary
    const { error: deleteError } = await supabase
      .from('summaries')
      .delete()
      .eq('id', summaryId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting summary:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Summary deleted successfully'
    });

  } catch (error) {
    console.error('Delete summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}