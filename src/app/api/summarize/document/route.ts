import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import pptx2json from 'pptx2json';

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

// Document processing utilities
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await file.text();
    }
    
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For PDF processing, we'll return a placeholder for now
      // In production, you'd use a PDF parsing library like pdf-parse
      return `PDF content extraction not yet implemented. File: ${file.name}`;
    }
    
    if (fileType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // For Word document processing, placeholder for now
      // In production, you'd use a library like mammoth.js
      return `Word document content extraction not yet implemented. File: ${file.name}`;
    }
    
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      return await file.text();
    }
    
    if (fileType === 'text/markdown' || fileName.endsWith('.md')) {
      return await file.text();
    }
    
    // Try to read as text for other formats
    return await file.text();
    
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text from ${file.name}`);
  }
}

async function generateDocumentSummary(
  content: string,
  length: 'short' | 'medium' | 'detailed' = 'medium',
  language: string = 'en',
  focusAreas?: string[]
): Promise<{ summary: string; keyPoints: string[]; insights: string[] }> {
  const languageInstructions = {
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

  const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;
  
  const lengthInstructions = {
    short: 'Provide a concise summary in 2-3 sentences.',
    medium: 'Provide a comprehensive summary in 1-2 paragraphs.',
    detailed: 'Provide a detailed summary with multiple paragraphs covering all major points.'
  };

  const focusInstruction = focusAreas && focusAreas.length > 0 
    ? `Pay special attention to these areas: ${focusAreas.join(', ')}.`
    : '';

  // Truncate content if too long
  const truncatedContent = content.length > 30000 ? content.substring(0, 30000) + '...' : content;

  // Helper function for AI calls with retry logic
  async function makeAICall(prompt: string, description: string): Promise<string> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= RATE_LIMIT.maxRetries; attempt++) {
      try {
        await rateLimiter.waitIfNeeded();
        
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        lastError = error;
        console.error(`${description} error (attempt ${attempt}):`, error);
        
        if (error?.status === 429 || error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
          if (attempt < RATE_LIMIT.maxRetries) {
            const delay = RATE_LIMIT.baseDelay * Math.pow(2, attempt - 1);
            console.log(`Rate limit hit for ${description}, waiting ${delay}ms before retry ${attempt + 1}/${RATE_LIMIT.maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`Google Gemini API quota exceeded while generating ${description}. Please try again later.`);
          }
        }
        
        throw new Error(`Failed to generate ${description}`);
      }
    }
    
    throw lastError || new Error(`Failed to generate ${description} after all retries`);
  }

  try {
    // Generate main summary
    const summaryPrompt = `${languageInstruction}\n\nAnalyze the following document and create a ${length} summary. ${lengthInstructions[length]} ${focusInstruction}\n\nDocument content:\n${truncatedContent}`;
    const summary = await makeAICall(summaryPrompt, 'summary');

    // Generate key points
    const keyPointsPrompt = `${languageInstruction}\n\nExtract 5-8 key points from the following document. Present them as clear, concise bullet points:\n\n${truncatedContent}`;
    const keyPointsText = await makeAICall(keyPointsPrompt, 'key points');
    
    const keyPoints = keyPointsText
      .split('\n')
      .map(point => point.replace(/^[-•*]\s*/, '').trim())
      .filter(point => point.length > 0)
      .slice(0, 8);

    // Generate insights
    const insightsPrompt = `${languageInstruction}\n\nProvide 3-5 analytical insights about the document. Focus on implications, significance, and deeper understanding:\n\n${truncatedContent}`;
    const insightsText = await makeAICall(insightsPrompt, 'insights');
    
    const insights = insightsText
      .split('\n')
      .map(insight => insight.replace(/^[-•*]\s*/, '').trim())
      .filter(insight => insight.length > 0)
      .slice(0, 5);

    return {
      summary,
      keyPoints,
      insights
    };

  } catch (error) {
    console.error('Error generating document summary:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const length = (formData.get('length') as string) || 'medium';
    const language = (formData.get('language') as string) || 'en';
    const focusAreasStr = formData.get('focusAreas') as string;
    const folderId = formData.get('folderId') as string;

    // Validate required fields
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Parse focus areas
    const focusAreas = focusAreasStr ? JSON.parse(focusAreasStr) : [];

    // Extract text from file
    const content = await extractTextFromFile(file);
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content could be extracted from the file' },
        { status: 400 }
      );
    }

    // Generate summary
    const { summary, keyPoints, insights } = await generateDocumentSummary(
      content,
      length as 'short' | 'medium' | 'detailed',
      language,
      focusAreas
    );

    // Store document in database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: file.name,
        file_type: file.type,
        storage_path: `documents/${userId}/${uuidv4()}-${file.name}`,
        folder_id: folderId || null,
        metadata: {
          size: file.size,
          processed_at: new Date().toISOString(),
          content_length: content.length
        },
        processing_status: 'completed'
      })
      .select()
      .single();

    if (docError) {
      console.error('Error storing document:', docError);
    }

    // Store summary in database
    const { data: summaryRecord, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        user_id: userId,
        title: `Summary of ${file.name}`,
        content: summary,
        summary_type: length,
        language: language,
        source_documents: document ? [document.id] : [],
        query: focusAreas.length > 0 ? `Focus areas: ${focusAreas.join(', ')}` : null
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Error storing summary:', summaryError);
    }

    return NextResponse.json({
      success: true,
      summary: {
        id: summaryRecord?.id || uuidv4(),
        content: summary,
        keyPoints,
        insights,
        length,
        language,
        focusAreas,
        document: {
          id: document?.id,
          filename: file.name,
          fileType: file.type,
          size: file.size
        },
        createdAt: new Date().toISOString()
      },
      message: 'Document summarized successfully'
    });

  } catch (error: any) {
    console.error('Document summarization error:', error);
    
    if (error.message?.includes('quota exceeded') || error.status === 429) {
      return NextResponse.json(
        { 
          error: 'Google Gemini API quota exceeded. Please try again later.',
          message: error.message || 'Rate limit exceeded',
          retryAfter: 60
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to process document'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const documentId = searchParams.get('documentId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('summaries')
      .select(`
        id,
        title,
        content,
        summary_type,
        language,
        source_documents,
        query,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (documentId) {
      query = query.contains('source_documents', [documentId]);
    }

    const { data: summaries, error } = await query;

    if (error) {
      console.error('Error fetching document summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch summaries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summaries: summaries || [],
      count: summaries?.length || 0
    });

  } catch (error) {
    console.error('Document summaries fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}