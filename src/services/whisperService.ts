import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { TranscriptionResult } from '@/types/voice';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface WhisperConfig {
  model?: string;
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

class WhisperService {
  private openai: OpenAI;
  private maxFileSize: number;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.maxFileSize = parseInt(process.env.MAX_AUDIO_SIZE || '25') * 1024 * 1024; // Convert MB to bytes

    // Configure ffmpeg binary path for conversions in Node runtime
    if (ffmpegStatic) {
      // @ts-ignore - ffmpeg-static provides a string path
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }
  }

  /**
   * Convert input audio (WebM/OGG) to WAV (mono, 16kHz) using ffmpeg.
   */
  private async convertToWav(input: File | Blob, suggestedName = 'audio.wav'): Promise<File> {
    const mime = (input.type || '').toLowerCase();
    const ext = mime.includes('ogg') ? 'ogg' : (mime.includes('webm') ? 'webm' : 'bin');
    const buffer = Buffer.from(await input.arrayBuffer());
    const tmpDir = os.tmpdir();
    const inPath = path.join(tmpDir, `nl-in-${Date.now()}.${ext}`);
    const outPath = path.join(tmpDir, `nl-out-${Date.now()}.wav`);

    await fs.promises.writeFile(inPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .save(outPath);
    });

    const outBuf = await fs.promises.readFile(outPath);
    // Cleanup temp files asynchronously
    fs.promises.unlink(inPath).catch(() => {});
    fs.promises.unlink(outPath).catch(() => {});

    const wavBlob = new Blob([outBuf], { type: 'audio/wav' });
    return new File([wavBlob], suggestedName, { type: 'audio/wav' });
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  async transcribeAudio(
    audioFile: File | Blob,
    config: WhisperConfig = {}
  ): Promise<TranscriptionResult> {
    try {
      // Validate file size
      if (audioFile.size > this.maxFileSize) {
        throw new Error(`Audio file size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
      }

      // Validate minimum file size for OpenAI (they require at least 0.1 seconds)
      if (audioFile.size < 2000) { // Less than 2KB is likely too short
        throw new Error('Audio file too small - please record for at least 0.5 seconds');
      }

      // Convert Blob to File if needed with proper format conversion
      let file: File;
      if (audioFile instanceof File) {
        file = audioFile;
        
        // Sanitize codec parameters in MIME type for Whisper compatibility
        const originalType = (file.type || '').toLowerCase();
        if (originalType.includes(';')) {
          const baseType = originalType.split(';')[0].trim();
          let name = file.name || 'audio.webm';
          if (baseType.includes('wav')) name = name.endsWith('.wav') ? name : 'audio.wav';
          else if (baseType.includes('webm')) name = name.endsWith('.webm') ? name : 'audio.webm';
          else if (baseType.includes('ogg')) name = name.endsWith('.ogg') ? name : 'audio.ogg';
          else if (baseType.includes('mp3') || baseType.includes('mpeg')) name = name.endsWith('.mp3') ? name : 'audio.mp3';
          else if (baseType.includes('mp4')) name = name.endsWith('.mp4') ? name : 'audio.mp4';
          else if (baseType.includes('m4a')) name = name.endsWith('.m4a') ? name : 'audio.m4a';
          file = new File([file], name, { type: baseType });
          console.log(`Sanitized file Content-Type for Whisper: ${baseType} (was ${originalType})`);
        }
        
        // Removed client-side audio conversion; Whisper accepts common formats directly
        // Do not convert formats client-side; Whisper accepts common formats including WebM/Opus
        // Keep original file as-is
      } else {
        const rawMime = audioFile.type || 'audio/webm';
        const mimeType = rawMime.split(';')[0].trim();
        
        // Pass through original blob without conversion
        const processedBlob = audioFile;
        
        // Determine file name and type based on processed blob
        let fileName = 'audio.webm';
        let fileType = mimeType || 'audio/webm';
        
        if (fileType.includes('wav')) {
          fileName = 'audio.wav';
        } else if (fileType.includes('ogg')) {
          fileName = 'audio.ogg';
        } else if (fileType.includes('mp3') || fileType.includes('mpeg')) {
          fileName = 'audio.mp3';
          fileType = 'audio/mpeg';
        } else if (fileType.includes('mp4')) {
          fileName = 'audio.mp4';
        } else if (fileType.includes('m4a')) {
          fileName = 'audio.m4a';
        } else if (fileType.includes('webm')) {
          fileName = 'audio.webm';
        } else {
          // Default to original mimeType if unknown
          fileName = 'audio.bin';
        }
        
        file = new File([processedBlob], fileName, { type: fileType });
      }

      console.log(`Sending to Whisper API: ${file.name}, size: ${file.size}, type: ${file.type}`);
      console.log(`Original blob type: ${audioFile.type}, size: ${audioFile.size}`);

      const startTime = Date.now();

      // Convert to an OpenAI-compatible Uploadable to ensure proper handling in Node runtime
      const uploadable = await toFile(file, file.name);

      // Try OpenAI Whisper API with original format first
      let transcription;
      try {
        transcription = await this.openai.audio.transcriptions.create({
          file: uploadable,
          model: config.model || 'whisper-1', // Use whisper-1 explicitly
          // Remove optional parameters that might cause issues
          ...(config.language && { language: config.language }),
          response_format: config.response_format || 'text', // Use config value or default to text
          ...(config.temperature !== undefined && { temperature: config.temperature }),
        });
      } catch (error: any) {
        // If OpenAI rejects the format, try converting to WAV
        if (error?.message?.includes('format') || error?.message?.includes('supported') || 
            error?.status === 400) {
          console.log('OpenAI rejected format, attempting WAV conversion...');
          
          try {
            const wavFile = await this.convertToWav(audioFile, 'audio.wav');
            const wavUploadable = await toFile(wavFile, wavFile.name);
            
            console.log(`Retrying with WAV: ${wavFile.name}, size: ${wavFile.size}, type: ${wavFile.type}`);
            
            transcription = await this.openai.audio.transcriptions.create({
              file: wavUploadable,
              model: config.model || 'whisper-1',
              ...(config.language && { language: config.language }),
              response_format: config.response_format || 'text',
              ...(config.temperature !== undefined && { temperature: config.temperature }),
            });
          } catch (conversionError) {
            console.error('WAV conversion failed:', conversionError);
            throw new Error(`Audio format not supported by OpenAI. Please try recording in a different format (WAV, MP3, or OGG).`);
          }
        } else {
          throw error;
        }
      }

      const duration = Date.now() - startTime;

      // Add detailed logging to debug the response
      console.log('Whisper API raw response:', JSON.stringify(transcription, null, 2));
      console.log('Response format used:', config.response_format || 'text');

      // Handle response based on format
      if (config.response_format === 'text') {
        const textResult = transcription as unknown as string;
        console.log('Text format result:', textResult);
        return {
          text: textResult,
          method: 'whisper',
          confidence: 0.9,
          language: config.language,
          duration
        };
      } else if (config.response_format === 'verbose_json') {
        // For verbose_json format, extract text properly
        const verboseResult = transcription as any;
        console.log('Verbose JSON result:', verboseResult);
        
        // Extract text from the verbose response
        const extractedText = verboseResult.text || '';
        console.log('Extracted text from verbose response:', extractedText);
        
        return {
          text: extractedText,
          method: 'whisper',
          confidence: verboseResult.confidence || 0.9,
          language: verboseResult.language || config.language,
          duration: verboseResult.duration || duration,
          // Include additional verbose_json fields
          segments: verboseResult.segments,
          words: verboseResult.words
        };
      } else {
        // For other JSON formats, the SDK returns the structured response
        const jsonResult = transcription as any;
        console.log('JSON format result:', jsonResult);
        
        return {
          text: jsonResult.text || '',
          method: 'whisper',
          confidence: jsonResult.confidence || 0.9,
          language: jsonResult.language || config.language,
          duration: jsonResult.duration || duration
        };
      }
    } catch (error: any) {
      console.error('Whisper API error:', error);

      // Note: Removed automatic WAV conversion fallback as it was causing unnecessary conversions
      // WebM files should be handled directly by the OpenAI API
      const message = (error?.message || '').toString();
      const lowerMsg = message.toLowerCase();
      console.log('OpenAI API error - no automatic conversion fallback applied:', lowerMsg);
      
      // Enhanced error handling to provide more informative messages
      let errorMessage = 'Transcription failed';
      const messageForMap = (error?.message || '').toString();
      
      if (messageForMap.includes('Invalid file format') || messageForMap.includes('unsupported file') || messageForMap.includes('invalid file')) {
        errorMessage = 'Audio format not supported by OpenAI. Please try recording in a different format (WAV, MP3, or OGG).';
      } else if (messageForMap.includes('WebM format is not reliably supported')) {
        errorMessage = messageForMap; // Use our custom WebM error message
      } else if (messageForMap.includes('decoding') || messageForMap.includes('codec') || messageForMap.includes('Could not decode audio')) {
        errorMessage = 'Audio decoding failed. Please try a shorter recording or use a different browser.';
      } else if (messageForMap.includes('rate limit') || messageForMap.includes('too many requests')) {
        errorMessage = 'Rate limited by OpenAI. Please wait a few seconds and try again.';
      } else if (messageForMap.includes('insufficient_quota') || messageForMap.includes('quota')) {
        errorMessage = 'OpenAI quota exceeded. Check your plan and billing details.';
      } else if (messageForMap.includes('timeout') || messageForMap.includes('ETIMEDOUT')) {
        errorMessage = 'Transcription timed out. Please try a shorter recording.';
      } else if (messageForMap) {
        errorMessage = messageForMap;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Detect language of audio using Whisper
   */
  /**
   * Translate audio to English using OpenAI Whisper translations endpoint
   */
  async translateAudio(
    audioFile: File | Blob,
    config: Omit<WhisperConfig, 'language'> = {}
  ): Promise<TranscriptionResult> {
    console.log('🔍 [DEBUG] translateAudio method called with config:', config);
    console.log('🔍 [DEBUG] Audio file details:', {
      name: audioFile instanceof File ? audioFile.name : 'blob',
      size: audioFile.size,
      type: audioFile.type
    });
    try {
      // Validate file size
      if (audioFile.size > this.maxFileSize) {
        throw new Error(`Audio file size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`);
      }

      // Validate minimum file size for OpenAI
      if (audioFile.size < 2000) {
        throw new Error('Audio file too small - please record for at least 0.5 seconds');
      }

      // Convert Blob to File if needed with proper format conversion
      let file: File;
      if (audioFile instanceof File) {
        file = audioFile;
        
        // Sanitize codec parameters in MIME type for Whisper compatibility
        const originalType = (file.type || '').toLowerCase();
        if (originalType.includes(';')) {
          const baseType = originalType.split(';')[0].trim();
          let name = file.name || 'audio.webm';
          if (baseType.includes('wav')) name = name.endsWith('.wav') ? name : 'audio.wav';
          else if (baseType.includes('webm')) name = name.endsWith('.webm') ? name : 'audio.webm';
          else if (baseType.includes('ogg')) name = name.endsWith('.ogg') ? name : 'audio.ogg';
          else if (baseType.includes('mp3') || baseType.includes('mpeg')) name = name.endsWith('.mp3') ? name : 'audio.mp3';
          else if (baseType.includes('mp4')) name = name.endsWith('.mp4') ? name : 'audio.mp4';
          else if (baseType.includes('m4a')) name = name.endsWith('.m4a') ? name : 'audio.m4a';
          file = new File([file], name, { type: baseType });
          console.log(`Sanitized file Content-Type for Whisper translation: ${baseType} (was ${originalType})`);
        }
      } else {
        const rawMime = audioFile.type || 'audio/webm';
        const mimeType = rawMime.split(';')[0].trim();
        
        const processedBlob = audioFile;
        
        let fileName = 'audio.webm';
        let fileType = mimeType || 'audio/webm';
        
        if (fileType.includes('wav')) {
          fileName = 'audio.wav';
        } else if (fileType.includes('ogg')) {
          fileName = 'audio.ogg';
        } else if (fileType.includes('mp3') || fileType.includes('mpeg')) {
          fileName = 'audio.mp3';
          fileType = 'audio/mpeg';
        } else if (fileType.includes('mp4')) {
          fileName = 'audio.mp4';
        } else if (fileType.includes('m4a')) {
          fileName = 'audio.m4a';
        } else if (fileType.includes('webm')) {
          fileName = 'audio.webm';
        } else {
          fileName = 'audio.bin';
        }
        
        file = new File([processedBlob], fileName, { type: fileType });
      }

      console.log(`Sending to Whisper Translation API: ${file.name}, size: ${file.size}, type: ${file.type}`);

      const startTime = Date.now();

      // Convert to an OpenAI-compatible Uploadable
      const uploadable = await toFile(file, file.name);

      // Use OpenAI Whisper translations endpoint (always translates to English)
      let translation;
      try {
        translation = await this.openai.audio.translations.create({
          file: uploadable,
          model: config.model || 'whisper-1',
          response_format: config.response_format || 'text',
          ...(config.temperature !== undefined && { temperature: config.temperature }),
        });
      } catch (error: any) {
        // If OpenAI rejects the format, try converting to WAV
        if (error?.message?.includes('format') || error?.message?.includes('supported') || 
            error?.status === 400) {
          console.log('OpenAI rejected format for translation, attempting WAV conversion...');
          
          try {
            const wavFile = await this.convertToWav(audioFile, 'audio.wav');
            const wavUploadable = await toFile(wavFile, wavFile.name);
            
            console.log(`Retrying translation with WAV: ${wavFile.name}, size: ${wavFile.size}, type: ${wavFile.type}`);
            
            translation = await this.openai.audio.translations.create({
              file: wavUploadable,
              model: config.model || 'whisper-1',
              response_format: config.response_format || 'text',
              ...(config.temperature !== undefined && { temperature: config.temperature }),
            });
          } catch (conversionError) {
            console.error('WAV conversion failed for translation:', conversionError);
            throw new Error(`Audio format not supported by OpenAI translation. Please try recording in a different format (WAV, MP3, or OGG).`);
          }
        } else {
          throw error;
        }
      }

      const duration = Date.now() - startTime;

      console.log('Whisper Translation API raw response:', JSON.stringify(translation, null, 2));
      console.log('Translation response format used:', config.response_format || 'text');

      // Handle response based on format
      if (config.response_format === 'text') {
        const textResult = translation as unknown as string;
        console.log('Translation text format result:', textResult);
        return {
          text: textResult,
          method: 'whisper-translate',
          confidence: 0.9,
          language: 'en', // Always English for translations
          duration
        };
      } else if (config.response_format === 'verbose_json') {
        const verboseResult = translation as any;
        console.log('Translation verbose JSON result:', verboseResult);
        
        const extractedText = verboseResult.text || '';
        console.log('Extracted text from translation verbose response:', extractedText);
        
        return {
          text: extractedText,
          method: 'whisper-translate',
          confidence: 0.9,
          language: 'en', // Always English for translations
          duration,
          segments: verboseResult.segments || []
        };
      } else {
        // For other formats (json, srt, vtt), return as text
        const result = translation as any;
        return {
          text: result.text || result.toString(),
          method: 'whisper-translate',
          confidence: 0.9,
          language: 'en', // Always English for translations
          duration
        };
      }

    } catch (error: any) {
      console.error('Whisper translation error:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async detectLanguage(audioFile: File | Blob): Promise<string> {
    try {
      const result = await this.transcribeAudio(audioFile, {
        response_format: 'verbose_json',
      });

      return result.language || 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'unknown';
    }
  }

  /**
   * Transcribe with automatic language detection
   */
  async transcribeWithAutoDetect(audioFile: File | Blob): Promise<TranscriptionResult> {
    return this.transcribeAudio(audioFile, {
      response_format: 'verbose_json',
      // Don't specify language to enable auto-detection
    });
  }

  /**
   * Transcribe with fallback mechanism
   */
  async transcribeWithFallback(
    audioFile: File | Blob,
    fallbackFunction?: (audioFile: File | Blob) => Promise<TranscriptionResult>
  ): Promise<TranscriptionResult> {
    try {
      return await this.transcribeWithAutoDetect(audioFile);
    } catch (error) {
      console.warn('Whisper transcription failed, attempting fallback:', error);
      
      if (fallbackFunction) {
        try {
          const fallbackResult = await fallbackFunction(audioFile);
          return {
            ...fallbackResult,
            method: 'web-speech',
          };
        } catch (fallbackError) {
          console.error('Fallback transcription also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Check if audio file is valid for Whisper processing
   */
  validateAudioFile(audioFile: File | Blob): { valid: boolean; error?: string } {
    if (audioFile.size === 0) {
      return { valid: false, error: 'Audio file is empty' };
    }

    if (audioFile.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: `File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit` 
      };
    }

    // Whisper is very flexible with audio formats, so we'll be permissive
    // Only reject if it's clearly not an audio file
    const fileType = audioFile.type?.toLowerCase().replace(/\s+/g, ''); // Remove all whitespace
    
    if (fileType && !fileType.startsWith('audio/')) {
      return { 
        valid: false, 
        error: `File must be an audio format, received: ${audioFile.type}` 
      };
    }

    // Log for debugging but don't reject
    console.log(`Audio file validation passed for type: ${audioFile.type}, size: ${audioFile.size} bytes`);

    return { valid: true };
  }

  /**
   * Get supported languages for Whisper
   */
  getSupportedLanguages(): string[] {
    return [
      'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da',
      'nl', 'en', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'he', 'hi', 'hu', 'is',
      'id', 'it', 'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms', 'mr', 'mi',
      'ne', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw',
      'sv', 'tl', 'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy'
    ];
  }
}

// Export singleton instance
export const whisperService = new WhisperService();
export default whisperService;