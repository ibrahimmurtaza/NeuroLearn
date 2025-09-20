import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { SummaryType } from '../../../../types/summarization';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 15, // Conservative limit for free tier
  DELAY_BETWEEN_REQUESTS: 4000, // 4 seconds between requests
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 2000, // 2 seconds base delay
};

// Rate limiter class
class RateLimiter {
  private requestTimes: number[] = [];
  
  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);
    
    // Check if we've exceeded the rate limit
    if (this.requestTimes.length >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
        await this.sleep(waitTime);
      }
    }
    
    // Add delay between requests
    await this.sleep(RATE_LIMIT.DELAY_BETWEEN_REQUESTS);
    
    // Record this request
    this.requestTimes.push(Date.now());
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const rateLimiter = new RateLimiter();

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

// Generate summary with AI with retry logic and rate limiting
async function generateSummaryWithAI(
  content: string,
  options: BatchSummaryRequest['options'],
  customPrompt?: string,
  documentTitle?: string
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RATE_LIMIT.MAX_RETRIES; attempt++) {
    try {
      // Apply rate limiting before each request
      await rateLimiter.waitForRateLimit();
      
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const { summaryType, language = 'en', length = 'medium' } = options;
      
      let prompt: string;
      
      if (customPrompt && customPrompt.trim()) {
        // When custom prompt is provided, make it the primary focus
        prompt = `You are an intelligent document analyzer. Your task is to analyze the following document and provide a ${length} summary that specifically addresses this question or topic: "${customPrompt}"

Instructions:
1. Start your summary with the document title: "${documentTitle || 'Document'}"
2. Carefully read through the entire document
3. Identify and extract only the sections, information, and insights that are directly relevant to: "${customPrompt}"
4. If the document contains relevant information, provide a comprehensive ${length} summary focusing specifically on the requested topic
5. If the document does not contain information relevant to the query, clearly state that the document does not address the specified topic
6. Structure your response as a ${summaryType} summary
7. Begin your summary with the document title for proper attribution and context`;
        
        if (language !== 'en') {
          prompt += ` in ${language}`;
        }
        
        prompt += `

Document Title: ${documentTitle || 'Document'}
Query/Topic: ${customPrompt}

Document Content:
${content}

Provide your targeted summary below (starting with the document title):`;
      } else {
        // Fallback to general summarization when no custom prompt
        prompt = `Create a ${length} ${summaryType} summary of the following content. Start your summary with the document title "${documentTitle || 'Document'}" for proper attribution and context`;
        if (language !== 'en') {
          prompt += ` in ${language}`;
        }
        prompt += `:

Document Title: ${documentTitle || 'Document'}

Document Content:
${content}

Provide your summary below (starting with the document title):`;
      }
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error: any) {
      lastError = error;
      console.error(`AI generation error (attempt ${attempt}/${RATE_LIMIT.MAX_RETRIES}):`, error);
      
      // Check if it's a quota exceeded error (429)
      if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
        if (attempt < RATE_LIMIT.MAX_RETRIES) {
          // Extract retry delay from error if available
          let retryDelay = RATE_LIMIT.BASE_RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          
          // Check if the error contains a specific retry delay
          if (error.errorDetails) {
            const retryInfo = error.errorDetails.find((detail: any) => detail['@type']?.includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
              const delayMatch = retryInfo.retryDelay.match(/([0-9.]+)s/);
              if (delayMatch) {
                retryDelay = Math.max(retryDelay, parseFloat(delayMatch[1]) * 1000);
              }
            }
          }
          
          console.log(`Quota exceeded. Retrying in ${retryDelay}ms (attempt ${attempt + 1}/${RATE_LIMIT.MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          throw new Error(`Google Gemini API quota exceeded. Please try again later. The free tier allows 250,000 input tokens per minute. Consider upgrading your plan or reducing the number of documents processed simultaneously.`);
        }
      } else {
        // For non-quota errors, don't retry
        throw new Error(`Failed to generate summary with AI: ${error.message}`);
      }
    }
  }
  
  throw lastError || new Error('Failed to generate summary after all retry attempts');
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
    const validSummaryTypes = ['brief', 'medium', 'detailed', 'bullet_points', 'executive', 'academic', 'custom'];
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
      .select('id, filename, file_type, storage_path, content, metadata')
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

    // Process each document with enhanced error handling
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      console.log(`Processing document ${i + 1}/${documents.length}: ${document.filename}`);
      
      try {
        // Extract text content from document content column (retrieval-based approach)
        const documentContent = document.content || document.metadata?.textContent || '';
        
        if (!documentContent) {
          console.error(`No text content found for document ${document.id}`);
          summaries.push({
            documentId: document.id,
            documentTitle: document.filename,
            summaryId: '',
            content: '',
            processingStatus: 'error',
            error: 'Document has no extractable text content'
          });
          failedSummaries++;
          continue;
        }
        
        // Truncate content if too long to avoid token limits
        const maxContentLength = 50000; // Reasonable limit for free tier
        const truncatedContent = documentContent.length > maxContentLength 
          ? documentContent.substring(0, maxContentLength) + '\n\n[Content truncated due to length]'
          : documentContent;
        
        // Generate summary with enhanced error handling
        const summary = await generateSummaryWithAI(
          truncatedContent,
          options,
          customPrompt,
          document.filename
        );
        
        // Map summary type to database schema values
        let dbSummaryType: 'short' | 'medium' | 'detailed';
        switch (options.summaryType) {
          case 'brief':
            dbSummaryType = 'short';
            break;
          case 'medium':
            dbSummaryType = 'medium';
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
        const summaryTitle = customPrompt || `Summary of ${document.filename}`;
        const { data: summaryRecord, error: summaryError } = await supabase
          .from('summaries')
          .insert({
            id: summaryId,
            user_id: userId,
            title: summaryTitle,
            content: summary,
            summary_type: dbSummaryType,
            language: options.language || 'en',
            source_documents: [{ name: document.filename, id: document.id }],
            query: null
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
        
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          if (error.message.includes('quota exceeded')) {
            errorMessage = 'API quota exceeded. Please try again later or upgrade your plan.';
          } else if (error.message.includes('Too Many Requests')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else {
            errorMessage = error.message;
          }
        }
        
        summaries.push({
          documentId: document.id,
          documentTitle: document.filename,
          summaryId: '',
          content: '',
          processingStatus: 'error',
          error: errorMessage
        });
        failedSummaries++;
        
        // If it's a quota error, we might want to stop processing more documents
        if (errorMessage.includes('quota exceeded') || errorMessage.includes('Rate limit exceeded')) {
          console.log('Quota/rate limit error detected. Stopping batch processing to prevent further errors.');
          // Add remaining documents as failed
          for (let j = i + 1; j < documents.length; j++) {
            const remainingDoc = documents[j];
            summaries.push({
              documentId: remainingDoc.id,
              documentTitle: remainingDoc.filename,
              summaryId: '',
              content: '',
              processingStatus: 'error',
              error: 'Batch processing stopped due to API quota limits'
            });
            failedSummaries++;
          }
          break; // Exit the loop
        }
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