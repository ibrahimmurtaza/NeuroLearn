import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DocumentStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

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

// Video processing utilities
async function extractAudioFromVideo(videoBuffer: Buffer, filename: string): Promise<Buffer> {
  // In a production environment, you would use FFmpeg to extract audio
  // For now, we'll assume the video file can be processed directly by Whisper
  // This is a simplified implementation
  return videoBuffer;
}

async function transcribeAudio(audioBuffer: Buffer, language?: string): Promise<string> {
  try {
    // Create a temporary file-like object for Whisper
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined,
      response_format: 'text'
    });

    return transcription;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

async function generateVideoSummary(
  transcript: string,
  summaryType: string,
  language: string = 'en'
): Promise<{ summary: string; keyPoints: string[]; timestamps?: string[] }> {
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
  
  // Truncate transcript if too long
  const truncatedTranscript = transcript.length > 30000 ? transcript.substring(0, 30000) + '...' : transcript;

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
    // Generate summary
    const summaryPrompt = `${languageInstruction}\n\nAnalyze the following video transcript and provide a ${summaryType} summary. Focus on the main topics, key insights, and important information discussed in the video:\n\n${truncatedTranscript}`;
    const summary = await makeAICall(summaryPrompt, 'video summary');

    // Generate key points
    const keyPointsPrompt = `${languageInstruction}\n\nExtract 5-8 key points from the following video transcript. Return them as a simple list, one point per line, without numbering or bullet points:\n\n${truncatedTranscript}`;
    const keyPointsText = await makeAICall(keyPointsPrompt, 'key points');
    
    const keyPoints = keyPointsText
      .split('\n')
      .map(point => point.trim())
      .filter(point => point.length > 0)
      .slice(0, 8);

    return {
      summary,
      keyPoints,
      timestamps: [] // TODO: Implement timestamp extraction
    };
  } catch (error) {
    console.error('Video summary generation error:', error);
    throw error;
  }
}

// Chunk transcript for better processing
function chunkTranscript(transcript: string, maxChunkSize: number = 4000): string[] {
  const sentences = transcript.split(/[.!?]+\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const userId = formData.get('userId') as string;
    const language = formData.get('language') as string || 'en';
    const summaryType = formData.get('summaryType') as string || 'detailed';

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Video file and user ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedVideoTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];

    if (!allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported video file type' },
        { status: 400 }
      );
    }

    // Validate file size (limit to 500MB for video)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file size exceeds 500MB limit' },
        { status: 400 }
      );
    }

    // Create document record for video
    const documentId = uuidv4();
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        content: '', // Will be updated with transcript
        language,
        folder_id: folderId || null,
        user_id: userId,
        processing_status: 'processing',
        word_count: 0,
        character_count: 0
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating video document:', docError);
      return NextResponse.json(
        { error: 'Failed to save video document' },
        { status: 500 }
      );
    }

    try {
      // Extract audio and transcribe
      const videoBuffer = Buffer.from(await file.arrayBuffer());
      const audioBuffer = await extractAudioFromVideo(videoBuffer, file.name);
      const transcript = await transcribeAudio(audioBuffer, language);

      if (!transcript || transcript.length < 50) {
        await supabase
          .from('documents')
          .update({ processing_status: 'failed' })
          .eq('id', documentId);

        return NextResponse.json(
          { error: 'Unable to extract sufficient audio content from video' },
          { status: 400 }
        );
      }

      // Update document with transcript
      await supabase
        .from('documents')
        .update({
          content: transcript,
          word_count: transcript.split(/\s+/).length,
          character_count: transcript.length
        })
        .eq('id', documentId);

      // Create document chunks
      const chunks = chunkTranscript(transcript);
      const chunkPromises = chunks.map((chunk, index) => 
        supabase
          .from('document_chunks')
          .insert({
            id: uuidv4(),
            document_id: documentId,
            chunk_index: index,
            content: chunk,
            word_count: chunk.split(/\s+/).length,
            character_count: chunk.length
          })
      );

      await Promise.all(chunkPromises);

      // Generate video summary
      const { summary, keyPoints, timestamps } = await generateVideoSummary(
        transcript,
        summaryType,
        language
      );

      // Create summary record
      const summaryId = uuidv4();
      const { data: summaryRecord, error: summaryError } = await supabase
        .from('summaries')
        .insert({
          id: summaryId,
          document_id: documentId,
          summary_type: summaryType,
          content: summary,
          key_points: keyPoints,
          language,
          word_count: summary.split(/\s+/).length,
          processing_status: 'ready',
          user_id: userId
        })
        .select()
        .single();

      if (summaryError) {
        console.error('Error creating summary:', summaryError);
        // Continue without failing the entire process
      }

      // Create summary source
      if (summaryRecord) {
        await supabase
          .from('summary_sources')
          .insert({
            id: uuidv4(),
            summary_id: summaryId,
            document_id: documentId,
            source_type: 'video',
            relevance_score: 1.0
          });
      }

      // Update document status to completed
      await supabase
        .from('documents')
        .update({ processing_status: 'ready' })
        .eq('id', documentId);

      const response = {
        success: true,
        document: {
          id: document.id,
          title: document.title,
          fileName: document.file_name,
          fileType: document.file_type,
          fileSize: document.file_size,
          language: document.language,
          processingStatus: 'ready',
          wordCount: transcript.split(/\s+/).length,
          characterCount: transcript.length,
          createdAt: document.created_at,
          updatedAt: document.updated_at
        },
        transcript,
        summary: summaryRecord ? {
          id: summaryRecord.id,
          documentId: summaryRecord.document_id,
          summaryType: summaryRecord.summary_type,
          content: summaryRecord.content,
          keyPoints: summaryRecord.key_points || [],
          language: summaryRecord.language,
          wordCount: summaryRecord.word_count,
          processingStatus: summaryRecord.processing_status,
          createdAt: summaryRecord.created_at,
          updatedAt: summaryRecord.updated_at
        } : undefined,
        chunksCreated: chunks.length,
        timestamps
      };

      return NextResponse.json(response);

    } catch (processingError: any) {
      // Update document status to failed
      await supabase
        .from('documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);

      console.error('Video processing error:', processingError);
      
      if (processingError.message?.includes('rate limit') || processingError.message?.includes('quota exceeded')) {
        return NextResponse.json(
          { 
            error: 'Google Gemini API quota exceeded. Please try again later.',
            message: processingError.message,
            details: processingError.message,
            retryAfter: 60
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to process video file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Video upload error:', error);
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
    const folderId = searchParams.get('folderId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch video documents (filter by video file types)
    const videoTypes = [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ];

    let query = supabase
      .from('documents')
      .select(`
        *,
        summaries!inner(
          id,
          summary_type,
          content,
          key_points,
          processing_status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .in('file_type', videoTypes)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: videoDocuments, error } = await query;

    if (error) {
      console.error('Error fetching video documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch video documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      videos: videoDocuments || [],
      total: videoDocuments?.length || 0
    });

  } catch (error) {
    console.error('Get video documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}