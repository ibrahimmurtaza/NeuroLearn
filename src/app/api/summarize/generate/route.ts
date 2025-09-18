import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { GenerateSummaryRequest, GenerateSummaryResponse, SummaryType, ProcessingStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Summary prompts for different types
const SUMMARY_PROMPTS = {
  brief: `Provide a concise summary of the following text in 2-3 sentences. Focus on the main points and key takeaways:\n\n`,
  detailed: `Provide a comprehensive summary of the following text. Include:
- Main themes and arguments
- Key supporting points
- Important details and examples
- Conclusions or recommendations

Text:\n\n`,
  bullet_points: `Create a bullet-point summary of the following text. Organize the information into clear, concise bullet points that capture:
- Main ideas
- Key facts
- Important details
- Action items (if any)

Text:\n\n`,
  executive: `Create an executive summary of the following text. Structure it as:
- Executive Overview (2-3 sentences)
- Key Findings
- Recommendations
- Next Steps (if applicable)

Text:\n\n`,
  academic: `Provide an academic-style summary of the following text. Include:
- Abstract/Overview
- Main arguments and thesis
- Methodology (if applicable)
- Key findings
- Conclusions and implications

Text:\n\n`,
  custom: `Summarize the following text according to these specific requirements: {customPrompt}\n\nText:\n\n`
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
  customPrompt?: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    let prompt = SUMMARY_PROMPTS[summaryType];
    if (summaryType === 'custom' && customPrompt) {
      prompt = prompt.replace('{customPrompt}', customPrompt);
    }
    
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;
    const fullPrompt = `${languageInstruction}\n\n${prompt}${text}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate summary with AI');
  }
}

async function generateKeyPoints(text: string, language: string = 'en'): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const languageInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS] || LANGUAGE_INSTRUCTIONS.en;
    
    const prompt = `${languageInstruction}\n\nExtract 5-8 key points from the following text. Return them as a simple list, one point per line, without numbering or bullet points:\n\n${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const keyPointsText = response.text();
    
    return keyPointsText
      .split('\n')
      .map(point => point.trim())
      .filter(point => point.length > 0)
      .slice(0, 8); // Limit to 8 key points
  } catch (error) {
    console.error('Key points generation error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSummaryRequest = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    const { documentId, summaryType, language = 'en', customPrompt, userId } = body;
    console.log('Extracted values:', { documentId, summaryType, language, customPrompt, userId });

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
    const validSummaryTypes = ['brief', 'detailed', 'bullet_points', 'executive', 'academic', 'custom'];
    if (!validSummaryTypes.includes(summaryType)) {
      return NextResponse.json(
        { error: 'Invalid summary type. Must be one of: brief, detailed, bullet_points, executive, academic, custom' },
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

    // Validate custom prompt length
    if (customPrompt && customPrompt.length > 1000) {
      return NextResponse.json(
        { error: 'Custom prompt must be less than 1000 characters' },
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
      .eq('document_id', documentId)
      .eq('summary_type', summaryType)
      .eq('language', language)
      .single();

    if (existingSummary) {
      return NextResponse.json({
        success: true,
        summary: {
          id: existingSummary.id,
          documentId: existingSummary.document_id,
          summaryType: existingSummary.summary_type,
          content: existingSummary.content,
          keyPoints: existingSummary.key_points || [],
          language: existingSummary.language,
          wordCount: existingSummary.word_count,
          processingStatus: existingSummary.processing_status,
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
        document_id: documentId,
        summary_type: summaryType,
        language,
        processing_status: 'processing',
        user_id: userId
      });

    if (createError) {
      console.error('Error creating summary record:', createError);
      return NextResponse.json(
        { error: 'Failed to create summary' },
        { status: 500 }
      );
    }

    try {
      // Generate summary content
      const summaryContent = await generateSummaryWithAI(
        document.content,
        summaryType,
        language,
        customPrompt
      );

      // Generate key points
      const keyPoints = await generateKeyPoints(document.content, language);

      // Update summary with generated content
      const { data: updatedSummary, error: updateError } = await supabase
        .from('summaries')
        .update({
          content: summaryContent,
          key_points: keyPoints,
          word_count: summaryContent.split(/\s+/).length,
          processing_status: 'completed'
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

      // Create summary sources record
      await supabase
        .from('summary_sources')
        .insert({
          id: uuidv4(),
          summary_id: summaryId,
          document_id: documentId,
          source_type: 'document',
          relevance_score: 1.0
        });

      const response: GenerateSummaryResponse = {
        success: true,
        summary: {
          id: updatedSummary.id,
          documentId: updatedSummary.document_id,
          summaryType: updatedSummary.summary_type,
          content: updatedSummary.content,
          keyPoints: updatedSummary.key_points || [],
          language: updatedSummary.language,
          wordCount: updatedSummary.word_count,
          processingStatus: updatedSummary.processing_status,
          createdAt: updatedSummary.created_at,
          updatedAt: updatedSummary.updated_at
        }
      };

      return NextResponse.json(response);

    } catch (aiError) {
      // Update summary status to failed
      await supabase
        .from('summaries')
        .update({ processing_status: 'failed' })
        .eq('id', summaryId);

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
      .eq('document_id', documentId)
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
        key_points: keyPoints,
        word_count: content ? content.split(/\s+/).length : 0,
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
        documentId: updatedSummary.document_id,
        summaryType: updatedSummary.summary_type,
        content: updatedSummary.content,
        keyPoints: updatedSummary.key_points || [],
        language: updatedSummary.language,
        wordCount: updatedSummary.word_count,
        processingStatus: updatedSummary.processing_status,
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

    // Delete summary sources first
    await supabase
      .from('summary_sources')
      .delete()
      .eq('summary_id', summaryId);

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