import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

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
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
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

    // Generate main summary
    const summaryPrompt = `${languageInstruction}\n\nAnalyze the following document and create a ${length} summary. ${lengthInstructions[length]} ${focusInstruction}\n\nDocument content:\n${content}`;
    
    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryResponse = await summaryResult.response;
    const summary = summaryResponse.text();

    // Generate key points
    const keyPointsPrompt = `${languageInstruction}\n\nExtract 5-8 key points from the following document. Present them as clear, concise bullet points:\n\n${content}`;
    
    const keyPointsResult = await model.generateContent(keyPointsPrompt);
    const keyPointsResponse = await keyPointsResult.response;
    const keyPointsText = keyPointsResponse.text();
    
    const keyPoints = keyPointsText
      .split('\n')
      .map(point => point.replace(/^[-•*]\s*/, '').trim())
      .filter(point => point.length > 0)
      .slice(0, 8);

    // Generate insights
    const insightsPrompt = `${languageInstruction}\n\nProvide 3-5 analytical insights about the document. Focus on implications, significance, and deeper understanding:\n\n${content}`;
    
    const insightsResult = await model.generateContent(insightsPrompt);
    const insightsResponse = await insightsResult.response;
    const insightsText = insightsResponse.text();
    
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
    throw new Error('Failed to generate document summary');
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

  } catch (error) {
    console.error('Document summarization error:', error);
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