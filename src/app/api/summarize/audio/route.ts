import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { AudioProcessRequest, AudioProcessResponse, ProcessingStatus } from '@/types/summarization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Audio processing utilities
async function transcribeAudioFile(audioBuffer: Buffer, filename: string, language?: string): Promise<string> {
  try {
    // Determine audio format from filename
    const extension = filename.toLowerCase().split('.').pop();
    let mimeType = 'audio/mpeg'; // default
    
    switch (extension) {
      case 'mp3':
        mimeType = 'audio/mpeg';
        break;
      case 'wav':
        mimeType = 'audio/wav';
        break;
      case 'm4a':
        mimeType = 'audio/mp4';
        break;
      case 'ogg':
        mimeType = 'audio/ogg';
        break;
      case 'flac':
        mimeType = 'audio/flac';
        break;
      case 'webm':
        mimeType = 'audio/webm';
        break;
    }

    // Create a file-like object for Whisper
    const audioFile = new File([audioBuffer], filename, { type: mimeType });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined,
      response_format: 'text',
      temperature: 0.2 // Lower temperature for more consistent transcription
    });

    return transcription;
  } catch (error) {
    console.error('Audio transcription error:', error);
    throw new Error('Failed to transcribe audio file');
  }
}

async function generateAudioSummary(
  transcript: string,
  summaryType: string,
  language: string = 'en',
  audioType: 'podcast' | 'lecture' | 'meeting' | 'interview' | 'general' = 'general'
): Promise<{ summary: string; keyPoints: string[]; speakers?: string[] }> {
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
    
    // Audio-specific summary prompts
    const audioPrompts = {
      podcast: 'Analyze this podcast transcript and provide a comprehensive summary including main topics discussed, key insights, and notable quotes or moments.',
      lecture: 'Summarize this lecture transcript focusing on the main educational content, key concepts taught, and important takeaways for students.',
      meeting: 'Provide a meeting summary including main discussion points, decisions made, action items, and next steps.',
      interview: 'Summarize this interview transcript highlighting the main questions asked, key responses, and important insights shared.',
      general: 'Provide a comprehensive summary of this audio content focusing on the main topics and key information discussed.'
    };

    const specificPrompt = audioPrompts[audioType] || audioPrompts.general;
    
    // Generate summary
    const summaryPrompt = `${languageInstruction}\n\n${specificPrompt}\n\nTranscript:\n${transcript}`;
    
    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryResponse = await summaryResult.response;
    const summary = summaryResponse.text();

    // Generate key points
    const keyPointsPrompt = `${languageInstruction}\n\nExtract 6-10 key points from the following audio transcript. Focus on the most important information, insights, or takeaways. Return them as a simple list, one point per line, without numbering or bullet points:\n\n${transcript}`;
    
    const keyPointsResult = await model.generateContent(keyPointsPrompt);
    const keyPointsResponse = await keyPointsResult.response;
    const keyPointsText = keyPointsResponse.text();
    
    const keyPoints = keyPointsText
      .split('\n')
      .map(point => point.trim())
      .filter(point => point.length > 0)
      .slice(0, 10);

    // Try to identify speakers (basic implementation)
    const speakerPattern = /\b(?:Speaker|Host|Guest|Interviewer|Interviewee|Participant)\s*[A-Z]?\d*\b/gi;
    const speakers = Array.from(new Set(transcript.match(speakerPattern) || []));

    return {
      summary,
      keyPoints,
      speakers: speakers.length > 0 ? speakers : undefined
    };
  } catch (error) {
    console.error('Audio summary generation error:', error);
    throw new Error('Failed to generate audio summary');
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
    const audioType = formData.get('audioType') as string || 'general';

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Audio file and user ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedAudioTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
      'audio/aac'
    ];

    if (!allowedAudioTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio file type' },
        { status: 400 }
      );
    }

    // Validate file size (limit to 200MB for audio)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file size exceeds 200MB limit' },
        { status: 400 }
      );
    }

    // Create document record for audio
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
      console.error('Error creating audio document:', docError);
      return NextResponse.json(
        { error: 'Failed to save audio document' },
        { status: 500 }
      );
    }

    try {
      // Transcribe audio
      const audioBuffer = Buffer.from(await file.arrayBuffer());
      const transcript = await transcribeAudioFile(audioBuffer, file.name, language);

      if (!transcript || transcript.length < 50) {
        await supabase
          .from('documents')
          .update({ processing_status: 'error' })
          .eq('id', documentId);

        return NextResponse.json(
          { error: 'Unable to extract sufficient content from audio file' },
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

      // Generate audio summary
      const { summary, keyPoints, speakers } = await generateAudioSummary(
        transcript,
        summaryType,
        language,
        audioType as any
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
          processing_status: 'completed',
          user_id: userId,
          metadata: speakers ? { speakers } : null
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
            source_type: 'audio',
            relevance_score: 1.0
          });
      }

      // Update document status to completed
      await supabase
        .from('documents')
        .update({ processing_status: 'ready' })
        .eq('id', documentId);

      const response: AudioProcessResponse = {
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
        speakers,
        duration: null // TODO: Implement audio duration detection
      };

      return NextResponse.json(response);

    } catch (processingError) {
      // Update document status to failed
      await supabase
        .from('documents')
        .update({ processing_status: 'error' })
        .eq('id', documentId);

      console.error('Audio processing error:', processingError);
      return NextResponse.json(
        { error: 'Failed to process audio file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Audio upload error:', error);
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

    // Fetch audio documents (filter by audio file types)
    const audioTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/mp4',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
      'audio/aac'
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
          metadata,
          created_at
        )
      `)
      .eq('user_id', userId)
      .in('file_type', audioTypes)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: audioDocuments, error } = await query;

    if (error) {
      console.error('Error fetching audio documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audio documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audios: audioDocuments || [],
      total: audioDocuments?.length || 0
    });

  } catch (error) {
    console.error('Get audio documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}