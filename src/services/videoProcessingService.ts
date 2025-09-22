import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { whisperService } from './whisperService';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from './errorHandlingService';
import ytdl from 'ytdl-core';
import { YoutubeTranscript } from 'youtube-transcript';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import os from 'os';

// Configure ffmpeg
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

export interface VideoMetadata {
  title: string;
  duration: number;
  format: string;
  resolution?: string;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface ProcessingProgress {
  stage: 'metadata' | 'audio_extraction' | 'transcription' | 'summarization' | 'storage' | 'database' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface ProcessingResult {
  id: string;
  title: string;
  summary: string;
  transcripts: Array<{
    start_time: number;
    end_time: number;
    text: string;
    confidence?: number;
    speaker?: string;
  }>;
  metadata: VideoMetadata;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface ProcessingOptions {
  userId?: string;
  extractFrames?: boolean;
  frameInterval?: number; // seconds
  summaryLength?: 'short' | 'medium' | 'long';
  onProgress?: (progress: ProcessingProgress) => void;
}

class VideoProcessingService {
  private openai: OpenAI;
  private whisperService: typeof whisperService;
  private supabase: any;
  private tempDir: string;
  private errorHandler: ErrorHandlingService;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Initialize Whisper service
    this.whisperService = whisperService;

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tempDir = path.join(os.tmpdir(), 'neurolearn-video-processing');
    this.errorHandler = ErrorHandlingService.getInstance();
    
    // Ensure temp directory exists
    this.ensureTempDirectory();

    // Set FFmpeg path
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
    }
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fsPromises.access(this.tempDir);
    } catch {
      await fsPromises.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Process YouTube video by URL
   */
  async processYouTubeVideo(
    videoUrl: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const { onProgress } = options;
    
    try {
      onProgress?.({ stage: 'metadata', progress: 10, message: 'Extracting video metadata...' });
      
      // Extract video metadata
      const metadata = await this.extractYouTubeMetadata(videoUrl);
      
      onProgress?.({ stage: 'transcription', progress: 30, message: 'Downloading transcript...' });
      
      // Get transcript using youtube-transcript-api
      const transcripts = await this.getYouTubeTranscript(videoUrl);
      
      onProgress?.({ stage: 'summarization', progress: 60, message: 'Generating summary...' });
      
      // Generate summary from transcript
      const summary = await this.generateSummary(transcripts.map(t => t.text).join(' '), options.summaryLength);
      
      onProgress?.({ stage: 'storage', progress: 80, message: 'Uploading to storage...' });
      
      // Extract and upload thumbnail if needed
      let thumbnailUrl = metadata.thumbnailUrl;
      if (options.extractFrames) {
        thumbnailUrl = await this.extractAndUploadThumbnail(videoUrl);
      }
      
      onProgress?.({ stage: 'database', progress: 90, message: 'Saving to database...' });
      
      // Save to database
      const result = await this.saveToDatabase({
        title: metadata.title,
        summary,
        transcripts,
        metadata,
        videoUrl,
        thumbnailUrl,
        userId: options.userId
      });
      
      onProgress?.({ stage: 'completed', progress: 100, message: 'Processing completed successfully!' });
      
      return result;
      
    } catch (error: any) {
      onProgress?.({ 
        stage: 'error', 
        progress: 0, 
        message: 'Processing failed', 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Process uploaded video file
   */
  async processUploadedVideo(
    videoFile: File,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const { onProgress } = options;
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;
    
    try {
      onProgress?.({ stage: 'metadata', progress: 10, message: 'Extracting video metadata...' });
      
      // Save uploaded file temporarily
      tempVideoPath = path.join(this.tempDir, `video_${Date.now()}_${videoFile.name}`);
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      await fsPromises.writeFile(tempVideoPath, videoBuffer);
      
      // Extract metadata
      const metadata = await this.extractVideoMetadata(tempVideoPath);
      
      onProgress?.({ stage: 'audio_extraction', progress: 30, message: 'Extracting audio...' });
      
      // Extract audio
      tempAudioPath = await this.extractAudio(tempVideoPath);
      
      onProgress?.({ stage: 'transcription', progress: 50, message: 'Transcribing audio...' });
      
      // Transcribe audio
      const audioBuffer = await fsPromises.readFile(tempAudioPath);
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
      const transcriptionResult = await this.whisperService.transcribeAudio(audioFile, {
        response_format: 'verbose_json'
      });
      
      // Convert transcription to our format
      const transcripts = this.convertTranscriptionToSegments(transcriptionResult);
      
      onProgress?.({ stage: 'summarization', progress: 70, message: 'Generating summary...' });
      
      // Generate summary
      const summary = await this.generateSummary(transcripts.map(t => t.text).join(' '), options.summaryLength);
      
      onProgress?.({ stage: 'storage', progress: 85, message: 'Uploading to storage...' });
      
      // Upload video and extract frames if needed
      const videoUrl = await this.uploadVideoToStorage(videoFile);
      let thumbnailUrl: string | undefined;
      
      if (options.extractFrames) {
        thumbnailUrl = await this.extractAndUploadFrames(tempVideoPath, options.frameInterval);
      }
      
      onProgress?.({ stage: 'database', progress: 95, message: 'Saving to database...' });
      
      // Save to database
      const result = await this.saveToDatabase({
        title: metadata.title || videoFile.name,
        summary,
        transcripts,
        metadata,
        videoUrl,
        thumbnailUrl,
        userId: options.userId
      });
      
      onProgress?.({ stage: 'completed', progress: 100, message: 'Processing completed successfully!' });
      
      return result;
      
    } catch (error: any) {
      onProgress?.({ 
        stage: 'error', 
        progress: 0, 
        message: 'Processing failed', 
        error: error.message 
      });
      throw error;
    } finally {
      // Cleanup temporary files
      if (tempVideoPath) {
        try {
          await fsPromises.access(tempVideoPath);
          await fsPromises.unlink(tempVideoPath);
        } catch {}
      }
      if (tempAudioPath) {
        try {
          await fsPromises.access(tempAudioPath);
          await fsPromises.unlink(tempAudioPath);
        } catch {}
      }
    }
  }

  /**
   * Extract metadata from YouTube video
   */
  private async extractYouTubeMetadata(videoUrl: string): Promise<VideoMetadata> {
    // This would typically use youtube-dl or similar
    // For now, return basic metadata
    const videoId = this.extractYouTubeVideoId(videoUrl);
    
    return {
      title: `YouTube Video ${videoId}`,
      duration: 0, // Would be extracted from actual video
      format: 'youtube',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }

  /**
   * Get YouTube transcript
   */
  private async getYouTubeTranscript(videoUrl: string): Promise<Array<{
    start_time: number;
    end_time: number;
    text: string;
    confidence?: number;
  }>> {
    // Try yt-dlp first as it's more reliable for server environments
    try {
      const transcript = await this.extractTranscriptWithYtDlp(videoUrl);
      if (transcript.length > 0) {
        return transcript;
      }
    } catch (error) {
      console.warn('yt-dlp transcript extraction failed:', error);
    }

    // Fallback to youtube-transcript package
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
      
      if (!transcript || transcript.length === 0) {
        console.warn('No transcript found for video:', videoUrl);
        return [];
      }
      
      return transcript.map((item, index) => ({
        start_time: Math.floor(item.offset / 1000), // Convert milliseconds to seconds
        end_time: Math.floor((item.offset + item.duration) / 1000),
        text: item.text.trim(),
        confidence: 0.95 // Default confidence for YouTube transcripts
      }));
    } catch (error) {
      console.error('Error fetching YouTube transcript:', error);
      return [];
    }
  }

  /**
   * Extract video metadata using FFmpeg
   */
  private async extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
        if (err) {
          reject(new Error(`Failed to extract metadata: ${err.message}`));
          return;
        }
        
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        
        resolve({
          title: path.basename(videoPath, path.extname(videoPath)),
          duration,
          format: metadata.format.format_name || 'unknown',
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
          fileSize: metadata.format.size ? parseInt(metadata.format.size.toString()) : undefined
        });
      });
    });
  }

  /**
   * Extract audio from video file
   */
  private async extractAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `audio_${Date.now()}.wav`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .on('end', () => resolve(audioPath))
        .on('error', (err: any) => reject(new Error(`Audio extraction failed: ${err.message}`)))
        .save(audioPath);
    });
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateSummary(text: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> {
    const lengthInstructions = {
      short: 'in 2-3 sentences',
      medium: 'in 1-2 paragraphs',
      long: 'in 3-4 detailed paragraphs'
    };
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that creates concise summaries of video content. Summarize the following transcript ${lengthInstructions[length]}, focusing on the main points and key information.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: length === 'short' ? 150 : length === 'medium' ? 300 : 500,
      temperature: 0.3
    });
    
    return response.choices[0]?.message?.content || 'Summary could not be generated.';
  }

  /**
   * Convert transcription result to segments
   */
  private convertTranscriptionToSegments(transcriptionResult: any): Array<{
    start_time: number;
    end_time: number;
    text: string;
    confidence?: number;
    speaker?: string;
  }> {
    // Handle different response formats
    if (typeof transcriptionResult === 'string') {
      // Simple text format - create one segment
      return [{
        start_time: 0,
        end_time: 0,
        text: transcriptionResult,
        confidence: 1.0
      }];
    }
    
    if (transcriptionResult.segments) {
      // Verbose JSON format with segments
      return transcriptionResult.segments.map((segment: any) => ({
        start_time: segment.start || 0,
        end_time: segment.end || 0,
        text: segment.text || '',
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined
      }));
    }
    
    // Fallback for other formats
    return [{
      start_time: 0,
      end_time: 0,
      text: transcriptionResult.text || transcriptionResult.toString(),
      confidence: 1.0
    }];
  }

  /**
   * Upload video to Supabase storage
   */
  private async uploadVideoToStorage(videoFile: File): Promise<string> {
    const fileName = `videos/${Date.now()}_${videoFile.name}`;
    const { data, error } = await this.supabase.storage
      .from('video-files')
      .upload(fileName, videoFile);
    
    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
    
    const { data: urlData } = this.supabase.storage
      .from('video-files')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }

  /**
   * Extract and upload thumbnail
   */
  private async extractAndUploadThumbnail(videoSource: string): Promise<string> {
    const thumbnailPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`);
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoSource)
        .screenshot({
          timestamps: ['10%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '320x240'
        })
        .on('end', async () => {
          try {
            const thumbnailBuffer = await fs.promises.readFile(thumbnailPath);
            const fileName = `thumbnails/${Date.now()}.jpg`;
            
            const { data, error } = await this.supabase.storage
              .from('video-files')
              .upload(fileName, thumbnailBuffer, { contentType: 'image/jpeg' });
            
            if (error) throw error;
            
            const { data: urlData } = this.supabase.storage
              .from('video-files')
              .getPublicUrl(fileName);
            
            // Cleanup
            fs.promises.unlink(thumbnailPath).catch(() => {});
            
            resolve(urlData.publicUrl);
          } catch (error: any) {
            reject(new Error(`Failed to upload thumbnail: ${error.message}`));
          }
        })
        .on('error', (err: any) => reject(new Error(`Thumbnail extraction failed: ${err.message}`)));
    });
  }

  /**
   * Extract transcript using yt-dlp as fallback
   */
  private async extractTranscriptWithYtDlp(videoUrl: string): Promise<Array<{
    start_time: number;
    end_time: number;
    text: string;
    confidence?: number;
  }>> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Extract video ID from URL
      const videoId = this.extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      // Use yt-dlp to extract subtitles in VTT format
      const tempDir = require('os').tmpdir();
      const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);
      
      const command = `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format vtt -o "${outputPath}" "${videoUrl}"`;
      
      console.log('Executing yt-dlp command:', command);
      const { stdout, stderr } = await execAsync(command);
      
      // Look for generated VTT files
      const vttFiles = [
        path.join(tempDir, `${videoId}.en.vtt`),
        path.join(tempDir, `${videoId}.en-US.vtt`),
        path.join(tempDir, `${videoId}.en-GB.vtt`)
      ];
      
      let vttContent = '';
      for (const vttFile of vttFiles) {
        if (fs.existsSync(vttFile)) {
          vttContent = fs.readFileSync(vttFile, 'utf8');
          fs.unlinkSync(vttFile); // Clean up
          break;
        }
      }
      
      if (!vttContent) {
        console.warn('No VTT subtitle files found');
        return [];
      }
      
      // Parse VTT content
      return this.parseVTTContent(vttContent);
      
    } catch (error) {
      console.error('yt-dlp transcript extraction failed:', error);
      return [];
    }
  }

  /**
   * Parse VTT subtitle content
   */
  private parseVTTContent(vttContent: string): Array<{
    start_time: number;
    end_time: number;
    text: string;
    confidence?: number;
  }> {
    const lines = vttContent.split('\n');
    const segments: Array<{
      start_time: number;
      end_time: number;
      text: string;
      confidence?: number;
    }> = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Look for timestamp lines (format: 00:00:00.000 --> 00:00:05.000)
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        const startTime = this.parseVTTTimestamp(startStr);
        const endTime = this.parseVTTTimestamp(endStr);
        
        // Get the text content (next non-empty lines until empty line or next timestamp)
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
          if (text) text += ' ';
          text += lines[i].trim();
          i++;
        }
        
        if (text && startTime >= 0 && endTime >= 0) {
          segments.push({
            start_time: Math.floor(startTime),
            end_time: Math.floor(endTime),
            text: text.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
            confidence: 0.9
          });
        }
      } else {
        i++;
      }
    }
    
    return segments;
  }

  /**
   * Parse VTT timestamp to seconds
   */
  private parseVTTTimestamp(timestamp: string): number {
    try {
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
      }
      return -1;
    } catch {
      return -1;
    }
  }

  /**
   * Extract and upload frames for analysis
   */
  private async extractAndUploadFrames(videoPath: string, interval: number = 30): Promise<string> {
    // This would extract frames at specified intervals
    // For now, just return thumbnail URL
    return this.extractAndUploadThumbnail(videoPath);
  }

  /**
   * Save processing result to database
   */
  private async saveToDatabase(data: {
    title: string;
    summary: string;
    transcripts: Array<{
      start_time: number;
      end_time: number;
      text: string;
      confidence?: number;
      speaker?: string;
    }>;
    metadata: VideoMetadata;
    videoUrl?: string;
    thumbnailUrl?: string;
    userId?: string;
  }): Promise<ProcessingResult> {
    // Insert video summary
    const { data: summaryData, error: summaryError } = await this.supabase
      .from('video_summaries')
      .insert({
        user_id: data.userId || null,
        title: data.title,
        video_url: data.videoUrl,
        summary: data.summary,
        thumbnail_url: data.thumbnailUrl,
        metadata: data.metadata
      })
      .select()
      .single();
    
    if (summaryError) {
      throw new Error(`Failed to save video summary: ${summaryError.message}`);
    }
    
    // Insert transcripts
    if (data.transcripts.length > 0) {
      const transcriptInserts = data.transcripts.map(transcript => ({
        video_summary_id: summaryData.id,
        start_time: transcript.start_time,
        end_time: transcript.end_time,
        text: transcript.text,
        confidence: transcript.confidence,
        speaker: transcript.speaker
      }));
      
      const { error: transcriptError } = await this.supabase
        .from('video_transcripts')
        .insert(transcriptInserts);
      
      if (transcriptError) {
        throw new Error(`Failed to save transcripts: ${transcriptError.message}`);
      }
    }
    
    return {
      id: summaryData.id,
      title: data.title,
      summary: data.summary,
      transcripts: data.transcripts,
      metadata: data.metadata,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl
    };
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }

  /**
   * Get processing status by ID
   */
  async getProcessingStatus(id: string): Promise<ProcessingResult | null> {
    const { data, error } = await this.supabase
      .from('video_summaries')
      .select(`
        *,
        video_transcripts(*)
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      title: data.title,
      summary: data.summary,
      transcripts: data.video_transcripts || [],
      metadata: data.metadata || {},
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url
    };
  }
}

export { VideoProcessingService };
export default VideoProcessingService;