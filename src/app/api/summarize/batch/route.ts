import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { SummaryType } from '../../../../types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Batch summarization request interface
export interface BatchSummaryRequest {
  documentIds: string[];
  options: {
    summaryType: SummaryType;
    language?: string;
    length?: 'short' | 'medium' | 'detailed';
    focusArea?: 'general' | 'key_points' | 'action_items' | 'technical';
  };
  customPrompt?: string;
  // userId is now obtained from authentication, not from request body
}

// Batch summarization response interface
export interface BatchSummaryResponse {
  success: boolean;
  batchId: string;
  summaries: Array<{
    documentId: string;
    documentTitle: string;
    summaryId: string;
    content: string;
    processingStatus: 'completed' | 'error';
    error?: string;
  }>;
  metadata: {
    totalDocuments: number;
    successfulSummaries: number;
    failedSummaries: number;
    processingTime: number;
  };
}

// Generate summary with AI
async function generateSummaryWithAI(
  content: string,
  options: BatchSummaryRequest['options'],
  customPrompt?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const { summaryType, language = 'en', length = 'medium' } = options;
    
    let prompt = `Create a ${length} ${summaryType} summary of the following content`;
    if (language !== 'en') {
      prompt += ` in ${language}`;
    }
    if (customPrompt) {
      prompt += `. Additional requirements: ${customPrompt}`;
    }
    prompt += `:\n\n${content}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate summary with AI');
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    console.log('Batch endpoint called');
    const body: BatchSummaryRequest = await request.json();
    console.log('Request body:', body);
    
    const { documentIds, options, customPrompt } = body;
    // Use authenticated user ID instead of request body userId
    const userId = user.id;

    // Basic validation
    if (!documentIds?.length || !options) {
      return NextResponse.json(
        { error: 'Document IDs and options are required' },
        { status: 400 }
      );
    }

    if (documentIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 documents allowed per batch' },
        { status: 400 }
      );
    }

    // Validate summary type
    const validSummaryTypes = ['brief', 'detailed', 'bullet_points', 'executive', 'academic', 'custom'];
    if (!validSummaryTypes.includes(options.summaryType)) {
      return NextResponse.json(
        { error: 'Invalid summary type' },
        { status: 400 }
      );
    }

    // Fetch documents for the authenticated user
    console.log('Fetching documents for IDs:', documentIds);
    
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, filename, file_type, storage_path')
      .in('id', documentIds)
      .eq('user_id', userId);

    console.log('Documents found:', documents);
    console.log('Document error:', docError);

    if (docError) {
      console.error('Database error:', docError);
      return NextResponse.json(
        { error: 'Database error', details: docError.message },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { 
          error: 'No documents found',
          message: 'No documents found with the provided IDs for this user',
          requestedIds: documentIds,
          userId: userId
        },
        { status: 404 }
      );
    }

    const batchId = uuidv4();
    const summaries: BatchSummaryResponse['summaries'] = [];
    let successfulSummaries = 0;
    let failedSummaries = 0;

    // Process each document
    for (const document of documents) {
      try {
        // For testing, use placeholder content since we don't have actual file reading
        const documentContent = `This is the content of ${document.filename} (${document.file_type}). This is a test document for batch summarization functionality.`;
        
        // Generate summary
        const summary = await generateSummaryWithAI(
          documentContent,
          options,
          customPrompt
        );
        
        // Map summary type to database schema values
        let dbSummaryType: 'short' | 'medium' | 'detailed';
        switch (options.summaryType) {
          case 'brief':
            dbSummaryType = 'short';
            break;
          case 'detailed':
          case 'executive':
          case 'academic':
            dbSummaryType = 'detailed';
            break;
          default:
            dbSummaryType = 'medium';
        }
        
        // Save summary to database using correct schema field names
        const summaryId = uuidv4();
        const { data: summaryRecord, error: summaryError } = await supabase
          .from('summaries')
          .insert({
            id: summaryId,
            user_id: userId,
            title: `Summary of ${document.filename}`,
            content: summary,
            summary_type: dbSummaryType,
            language: options.language || 'en',
            source_documents: [document.id],
            query: customPrompt || null
          })
          .select()
          .single();

        if (summaryError) {
          console.error('Error saving summary:', summaryError);
          summaries.push({
            documentId: document.id,
            documentTitle: document.filename,
            summaryId: '',
            content: '',
            processingStatus: 'error',
            error: 'Failed to save summary'
          });
          failedSummaries++;
        } else {
          summaries.push({
            documentId: document.id,
            documentTitle: document.filename,
            summaryId: summaryRecord.id,
            content: summary,
            processingStatus: 'completed'
          });
          successfulSummaries++;
        }
      } catch (error) {
        console.error(`Error processing document ${document.id}:`, error);
        summaries.push({
          documentId: document.id,
          documentTitle: document.filename,
          summaryId: '',
          content: '',
          processingStatus: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedSummaries++;
      }
    }

    const processingTime = Date.now() - startTime;

    const response: BatchSummaryResponse = {
      success: true,
      batchId,
      summaries,
      metadata: {
        totalDocuments: documents.length,
        successfulSummaries,
        failedSummaries,
        processingTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Batch summarization error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: 'Batch summarization GET endpoint',
      status: 'working',
      user: user.email
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}