import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { MultiDocAnalysisRequest, MultiDocAnalysisResponse, ProcessingStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 15,
  baseDelay: 2000, // 2 seconds
  maxRetries: 3
};

// Rate limiter class
class RateLimiter {
  private requests: number[] = [];
  
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // If we're at the limit, wait
    if (this.requests.length >= RATE_LIMIT.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request
    this.requests.push(now);
    
    // Add base delay between requests
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.baseDelay));
  }
}

const rateLimiter = new RateLimiter();

// Multi-document analysis utilities
async function analyzeMultipleDocuments(
  documents: Array<{ id: string; title: string; content: string }>,
  analysisType: 'comparison' | 'synthesis' | 'themes' | 'timeline' = 'synthesis',
  language: string = 'en'
): Promise<{ analysis: string; insights: string[]; connections: Array<{ doc1: string; doc2: string; relationship: string }> }> {
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
  
  const analysisPrompts = {
    comparison: `${languageInstruction}\n\nCompare and contrast the following documents. Identify similarities, differences, strengths, and weaknesses of each document. Provide a comprehensive comparative analysis.`,
    synthesis: `${languageInstruction}\n\nSynthesize the information from the following documents into a cohesive analysis. Identify common themes, complementary information, and create a unified understanding.`,
    themes: `${languageInstruction}\n\nAnalyze the following documents to identify recurring themes, patterns, and concepts. Group related ideas and explain their significance across the documents.`,
    timeline: `${languageInstruction}\n\nAnalyze the following documents to create a chronological understanding. Identify temporal relationships, sequences of events, and historical progression.`
  };

  // Prepare document content for analysis (truncate if too long)
  const documentContent = documents.map((doc, index) => {
    const truncatedContent = doc.content.length > 10000 ? doc.content.substring(0, 10000) + '...' : doc.content;
    return `Document ${index + 1}: ${doc.title}\n${truncatedContent}\n\n`;
  }).join('');

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
    const analysisPrompt = `${analysisPrompts[analysisType]}\n\nDocuments to analyze:\n\n${documentContent}`;
    const analysis = await makeAICall(analysisPrompt, 'multi-document analysis');

    // Generate insights
    const insightsPrompt = `${languageInstruction}\n\nBased on the analysis of multiple documents, extract 5-8 key insights that emerge from the collective information. Focus on new understanding that comes from considering all documents together:\n\n${analysis}`;
    const insightsText = await makeAICall(insightsPrompt, 'insights');
    
    const insights = insightsText
      .split('\n')
      .map(insight => insight.trim())
      .filter(insight => insight.length > 0)
      .slice(0, 8);

    // Generate connections between documents
    const connectionsPrompt = `${languageInstruction}\n\nIdentify specific relationships and connections between the documents. For each connection, specify which documents are related and describe the nature of their relationship:\n\n${documentContent}`;
    const connectionsText = await makeAICall(connectionsPrompt, 'connections');
    
    // Parse connections (simplified implementation)
    const connections: Array<{ doc1: string; doc2: string; relationship: string }> = [];
    const connectionLines = connectionsText.split('\n').filter(line => line.includes('Document'));
    
    for (let i = 0; i < Math.min(connectionLines.length, 5); i++) {
      const line = connectionLines[i];
      const doc1Match = line.match(/Document (\d+)/);
      const doc2Match = line.match(/Document (\d+).*Document (\d+)/);
      
      if (doc1Match && doc2Match && doc2Match[2]) {
        const doc1Index = parseInt(doc1Match[1]) - 1;
        const doc2Index = parseInt(doc2Match[2]) - 1;
        
        if (doc1Index < documents.length && doc2Index < documents.length && doc1Index !== doc2Index) {
          connections.push({
            doc1: documents[doc1Index].title,
            doc2: documents[doc2Index].title,
            relationship: line.replace(/Document \d+[^:]*:?\s*/, '').trim()
          });
        }
      }
    }

    return {
      analysis,
      insights,
      connections
    };
  } catch (error: any) {
    console.error('Multi-document analysis error:', error);
    
    if (error.message?.includes('rate limit') || error.message?.includes('quota exceeded')) {
      throw new Error(`Google Gemini API quota exceeded. Please try again later. ${error.message}`);
    }
    
    throw new Error('Failed to analyze multiple documents');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MultiDocAnalysisRequest = await request.json();
    const { documentIds, analysisType = 'synthesis', language = 'en', userId, title } = body;

    if (!documentIds?.length || !userId) {
      return NextResponse.json(
        { error: 'Document IDs and user ID are required' },
        { status: 400 }
      );
    }

    if (documentIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 documents are required for multi-document analysis' },
        { status: 400 }
      );
    }

    // Fetch documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, title, content')
      .in('id', documentIds)
      .eq('user_id', userId);

    if (docError || !documents || documents.length < 2) {
      return NextResponse.json(
        { error: 'Failed to fetch documents or insufficient documents found' },
        { status: 404 }
      );
    }

    // Check if analysis already exists for this combination
    const { data: existingAnalysis } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('summary_type', `multi_doc_${analysisType}`)
      .eq('language', language)
      .contains('metadata', { document_ids: documentIds.sort() })
      .single();

    if (existingAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: {
          id: existingAnalysis.id,
          title: existingAnalysis.metadata?.title || 'Multi-Document Analysis',
          analysisType,
          content: existingAnalysis.content,
          insights: existingAnalysis.key_points || [],
          connections: existingAnalysis.metadata?.connections || [],
          documentIds: existingAnalysis.metadata?.document_ids || [],
          language: existingAnalysis.language,
          createdAt: existingAnalysis.created_at,
          updatedAt: existingAnalysis.updated_at
        }
      });
    }

    // Perform multi-document analysis
    const { analysis, insights, connections } = await analyzeMultipleDocuments(
      documents,
      analysisType as any,
      language
    );

    // Save analysis as a special summary
    const analysisId = uuidv4();
    const { data: analysisRecord, error: analysisError } = await supabase
      .from('summaries')
      .insert({
        id: analysisId,
        document_id: documents[0].id, // Primary document
        summary_type: `multi_doc_${analysisType}`,
        content: analysis,
        key_points: insights,
        language,
        word_count: analysis.split(/\s+/).length,
        processing_status: 'ready',
        user_id: userId,
        metadata: {
          title: title || `Multi-Document ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis`,
          document_ids: documentIds.sort(),
          document_titles: documents.map(doc => doc.title),
          connections,
          analysis_type: analysisType
        }
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error saving analysis:', analysisError);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      );
    }

    // Create summary sources for all documents
    const sourcePromises = documents.map(doc => 
      supabase
        .from('summary_sources')
        .insert({
          id: uuidv4(),
          summary_id: analysisId,
          document_id: doc.id,
          source_type: 'multi_document',
          relevance_score: 1.0 / documents.length
        })
    );

    await Promise.all(sourcePromises);

    const response: MultiDocAnalysisResponse = {
      success: true,
      analysis: {
        id: analysisRecord.id,
        title: analysisRecord.metadata?.title || 'Multi-Document Analysis',
        analysisType,
        content: analysisRecord.content,
        insights: analysisRecord.key_points || [],
        connections: analysisRecord.metadata?.connections || [],
        documentIds: analysisRecord.metadata?.document_ids || [],
        language: analysisRecord.language,
        createdAt: analysisRecord.created_at,
        updatedAt: analysisRecord.updated_at
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Multi-document analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const analysisType = searchParams.get('analysisType');
    const language = searchParams.get('language');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('summaries')
      .select('*')
      .eq('user_id', userId)
      .like('summary_type', 'multi_doc_%')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (analysisType) {
      query = query.eq('summary_type', `multi_doc_${analysisType}`);
    }

    if (language) {
      query = query.eq('language', language);
    }

    const { data: analyses, error } = await query;

    if (error) {
      console.error('Error fetching multi-document analyses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analyses' },
        { status: 500 }
      );
    }

    const formattedAnalyses = analyses?.map(analysis => ({
      id: analysis.id,
      title: analysis.metadata?.title || 'Multi-Document Analysis',
      analysisType: analysis.summary_type.replace('multi_doc_', ''),
      content: analysis.content,
      insights: analysis.key_points || [],
      connections: analysis.metadata?.connections || [],
      documentIds: analysis.metadata?.document_ids || [],
      documentTitles: analysis.metadata?.document_titles || [],
      language: analysis.language,
      createdAt: analysis.created_at,
      updatedAt: analysis.updated_at
    })) || [];

    return NextResponse.json({
      analyses: formattedAnalyses,
      total: formattedAnalyses.length
    });

  } catch (error) {
    console.error('Get multi-document analyses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}