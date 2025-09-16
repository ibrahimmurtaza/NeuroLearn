import { NextRequest, NextResponse } from 'next/server';
import { whisperService } from '@/services/whisperService';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check if the request contains form data
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;
    const autoDetect = formData.get('autoDetect') === 'true';
    const translate = formData.get('translate') === 'true';
    
    // Debug logging
    console.log('API received parameters:', {
      language,
      autoDetect,
      translate,
      translateRaw: formData.get('translate')
    });
    
    // Handle additional parameters from enhanced hook
    const model = (formData.get('model') as string) || 'whisper-1';
    const responseFormat = (formData.get('response_format') as string) || 'verbose_json';
    const temperature = parseFloat((formData.get('temperature') as string) || '0');

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Log file details for debugging
    console.log('Received audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      lastModified: audioFile.lastModified
    });

    // Validate audio file
    const validation = whisperService.validateAudioFile(audioFile);
    if (!validation.valid) {
      console.error('Audio file validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Transcribe audio
    let result;
    if (translate) {
      // Use translation endpoint to translate to English
      result = await whisperService.translateAudio(audioFile, {
        model,
        response_format: responseFormat as any,
        temperature,
      });
    } else if (autoDetect) {
      result = await whisperService.transcribeWithAutoDetect(audioFile);
    } else {
      result = await whisperService.transcribeAudio(audioFile, {
        model,
        language: language || undefined,
        response_format: responseFormat as any,
        temperature,
      });
    }

    return NextResponse.json({
      success: true,
      transcription: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Transcription API error:', error);

    // Prefer OpenAI-style error fields if present
    const message = (error?.message || error?.error?.message || 'Unknown error').toString();
    const openaiStatus = error?.status || error?.error?.status;

    // Map known errors to 4xx to avoid masking client issues as 500s
    let status = 500;
    if (
      message.includes('Audio file too small') ||
      message.includes('File size exceeds') ||
      message.includes('Invalid audio format') ||
      message.includes('must be an audio format') ||
      message.includes('Content-Type must be multipart/form-data') ||
      message.includes('Audio format not supported by OpenAI')
    ) {
      status = 400;
    } else if (typeof openaiStatus === 'number') {
      // If OpenAI SDK provides an HTTP status, use it
      status = openaiStatus;
    }
    
    return NextResponse.json(
      {
        error: 'Transcription failed',
        message,
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Whisper Transcription API',
    supportedLanguages: whisperService.getSupportedLanguages(),
    maxFileSize: process.env.MAX_AUDIO_SIZE || '25MB',
    supportedFormats: [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/m4a',
      'audio/ogg',
      'audio/flac',
    ],
  });
}