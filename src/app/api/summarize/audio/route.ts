import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Initialize Supabase client with SSR support
function createSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// Service role client for database operations
const supabaseServiceUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const { createClient } = require('@supabase/supabase-js');
const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey);

// Database functions
async function saveAudioFile(userId: string, filename: string, fileSize: number, fileType: string, language: string, audioType: string): Promise<string> {
  const { data, error } = await supabaseService
    .from('audio_files')
    .insert({
      user_id: userId,
      filename,
      original_filename: filename,
      file_type: fileType,
      storage_path: `/audio/${Date.now()}_${filename}`, // Placeholder storage path
      file_size: fileSize,
      processing_status: 'processed'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving audio file:', error);
    throw new Error('Failed to save audio file metadata');
  }

  return data.id;
}

async function saveTranscript(audioFileId: string, userId: string, transcript: string, language: string): Promise<string> {
  const { data, error } = await supabaseService
    .from('audio_transcripts')
    .insert({
      audio_file_id: audioFileId,
      user_id: userId,
      transcript_text: transcript,
      language,
      confidence_score: 0.95 // Default confidence for Whisper
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving transcript:', error);
    throw new Error('Failed to save transcript');
  }

  return data.id;
}

async function saveSummary(audioFileId: string, transcriptId: string, userId: string, title: string, summary: string, keyPoints: string[], summaryType: string, language: string): Promise<string> {
  const { data, error } = await supabaseService
    .from('audio_summaries')
    .insert({
      audio_file_id: audioFileId,
      transcript_id: transcriptId,
      user_id: userId,
      title,
      summary_text: summary,
      key_points: keyPoints,
      summary_type: summaryType,
      language
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving summary:', error);
    throw new Error('Failed to save summary');
  }

  return data.id;
}

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

// Retry utility function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

async function generateAudioSummary(
  transcript: string,
  summaryType: string,
  language: string = 'en',
  audioType: 'podcast' | 'lecture' | 'meeting' | 'interview' | 'general' = 'general'
): Promise<{ summary: string; keyPoints: string[]; speakers?: string[] }> {
  try {
    // Check if API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API key is not configured');
    }
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
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
    
    // Generate summary with retry logic
    const summaryPrompt = `${languageInstruction}\n\n${specificPrompt}\n\nTranscript:\n${transcript}`;
    
    console.log('Generating summary with Gemini API...');
    const summary = await retryWithBackoff(async () => {
      const summaryResult = await model.generateContent(summaryPrompt);
      const summaryResponse = await summaryResult.response;
      return summaryResponse.text();
    });

    // Generate key points with retry logic
    const keyPointsPrompt = `${languageInstruction}\n\nExtract 6-10 key points from the following audio transcript. Focus on the most important information, insights, or takeaways. Return them as a simple list, one point per line, without numbering or bullet points:\n\n${transcript}`;
    
    console.log('Generating key points with Gemini API...');
    const keyPointsText = await retryWithBackoff(async () => {
      const keyPointsResult = await model.generateContent(keyPointsPrompt);
      const keyPointsResponse = await keyPointsResult.response;
      return keyPointsResponse.text();
    });
    
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
    console.error('Audio summary generation error:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
      timestamp: new Date().toISOString()
    });
    
    // Check if it's a specific API error
    if ((error as any)?.status === 503) {
      throw new Error('Google Gemini API is temporarily unavailable (503). Please try again in a few minutes.');
    }
    
    if ((error as any)?.status === 429) {
      throw new Error('API rate limit exceeded. Please wait a moment and try again.');
    }
    
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      throw new Error('API authentication failed. Please check the Google API key configuration.');
    }
    
    // For other errors, provide a more informative message
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('API key')) {
      throw new Error('Google API key is invalid or not configured properly.');
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      throw new Error('API quota exceeded. Please try again later or check your Google Cloud billing.');
    }
    
    // Generic fallback error
    throw new Error(`Failed to generate audio summary: ${errorMessage}`);
  }
}

// Chunk transcript function removed - not needed for simplified API

export async function POST(request: NextRequest) {
  try {
    console.log('=== Audio Processing Started ===');
    
    // Get user authentication using Supabase SSR
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required. Please log in to upload audio files.' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log('User authenticated:', userId);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = formData.get('language') as string || 'en';
    const summaryType = formData.get('summaryType') as string || 'detailed';
    const audioType = formData.get('audioType') as string || 'general';
    
    console.log('Form data received:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type,
      language, 
      summaryType, 
      audioType 
    });

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
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

    // Transcribe audio
    console.log('Starting audio transcription...');
    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeAudioFile(audioBuffer, file.name, language);
    console.log('Transcription completed. Length:', transcript?.length);

    if (!transcript || transcript.length < 50) {
      console.log('Transcript too short or empty:', transcript?.length);
      return NextResponse.json(
        { error: 'Unable to extract sufficient content from audio file' },
        { status: 400 }
      );
    }

    // Generate audio summary
    console.log('Starting summary generation...');
    const { summary, keyPoints, speakers } = await generateAudioSummary(
      transcript,
      summaryType,
      language,
      audioType as any
    );
    console.log('Summary generation completed successfully');

    // Save to database
    let audioFileId: string | null = null;
    let transcriptId: string | null = null;
    let summaryId: string | null = null;

    try {
      // Save audio file metadata
      audioFileId = await saveAudioFile(
        userId,
        file.name,
        file.size,
        file.type,
        language,
        audioType
      );

      // Save transcript
      transcriptId = await saveTranscript(
        audioFileId,
        userId,
        transcript,
        language
      );

      // Generate a title from the first few words of the summary
      const title = summary.split(' ').slice(0, 8).join(' ') + (summary.split(' ').length > 8 ? '...' : '');

      // Save summary
      summaryId = await saveSummary(
        audioFileId,
        transcriptId,
        userId,
        title,
        summary,
        keyPoints,
        'medium',
        language
      );
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Continue with response even if database save fails
    }

    // Return response with database IDs if available
    const response = {
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      language,
      transcript,
      summary: {
        content: summary,
        keyPoints,
        summaryType,
        language,
        wordCount: summary.split(/\s+/).length
      },
      speakers,
      wordCount: transcript.split(/\s+/).length,
      processedAt: new Date().toISOString(),
      // Include database IDs if saved successfully
      ...(audioFileId && { audioFileId }),
      ...(transcriptId && { transcriptId }),
      ...(summaryId && { summaryId })
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Audio processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio file: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint removed - simplified API only supports POST for transcribe-then-summarize