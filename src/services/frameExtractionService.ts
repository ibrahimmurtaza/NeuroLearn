import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from './errorHandlingService';
import fs from 'fs';
const fsPromises = fs.promises;
import path from 'path';
import os from 'os';

// Configure ffmpeg
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

export interface FrameExtractionOptions {
  interval?: number; // Extract frame every N seconds
  count?: number; // Extract specific number of frames
  timestamps?: number[]; // Extract frames at specific timestamps
  size?: string; // Frame size (e.g., '320x240', '640x480')
  format?: 'jpg' | 'png'; // Output format
  quality?: number; // JPEG quality (1-31, lower is better)
}

export interface ExtractedFrame {
  timestamp: number;
  filename: string;
  localPath: string;
  publicUrl?: string;
  size: {
    width: number;
    height: number;
  };
}

export interface FrameAnalysis {
  videoId: string;
  frames: ExtractedFrame[];
  totalFrames: number;
  videoDuration: number;
  extractionMethod: 'interval' | 'count' | 'timestamps';
  createdAt: Date;
}

class FrameExtractionService {
  private supabase: any;
  private tempDir: string;
  private errorHandler: ErrorHandlingService;

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tempDir = path.join(os.tmpdir(), 'neurolearn-frames');
    this.errorHandler = ErrorHandlingService.getInstance();
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Extract frames from video file
   */
  async extractFrames(
    videoPath: string,
    options: FrameExtractionOptions = {},
    userId?: string
  ): Promise<ExtractedFrame[]> {
    const operationId = `frame-extraction-${Date.now()}`;
    
    return await this.errorHandler.executeWithProgress(
      operationId,
      async (updateProgress) => {
        const {
          interval = 30,
          count,
          timestamps,
          size = '640x480',
          format = 'jpg',
          quality = 2
        } = options;

        updateProgress('initialization', 0, 'Initializing frame extraction');

        // Get video metadata first with retry logic
        const metadata = await this.errorHandler.executeWithRetry(
          () => this.getVideoMetadata(videoPath),
          { operationName: 'get-video-metadata', userId }
        );
        const videoDuration = metadata.duration;

        updateProgress('analysis', 10, 'Analyzing video duration');

        let extractionTimestamps: number[];

        if (timestamps) {
          // Use provided timestamps
          extractionTimestamps = timestamps.filter(t => t >= 0 && t <= videoDuration);
        } else if (count) {
          // Extract specific number of frames evenly distributed
          extractionTimestamps = [];
          const step = videoDuration / (count + 1);
          for (let i = 1; i <= count; i++) {
            extractionTimestamps.push(step * i);
          }
        } else {
          // Extract frames at regular intervals
          extractionTimestamps = [];
          for (let t = interval; t < videoDuration; t += interval) {
            extractionTimestamps.push(t);
          }
        }

        if (extractionTimestamps.length === 0) {
          throw new Error('No valid timestamps for frame extraction');
        }

        const frames: ExtractedFrame[] = [];
        const sessionId = Date.now();

        updateProgress('extraction', 20, `Extracting ${extractionTimestamps.length} frames`);

        // Extract frames at specified timestamps
        for (let i = 0; i < extractionTimestamps.length; i++) {
          const timestamp = extractionTimestamps[i];
          const filename = `frame_${sessionId}_${i.toString().padStart(4, '0')}.${format}`;
          const localPath = path.join(this.tempDir, filename);

          updateProgress('extraction', 20 + (i / extractionTimestamps.length) * 60, `Extracting frame ${i + 1}/${extractionTimestamps.length}`);

          try {
            await this.errorHandler.executeWithRetry(
              () => this.extractSingleFrame(videoPath, timestamp, localPath, size, quality),
              { operationName: 'extract-single-frame', userId }
            );
            
            // Get frame dimensions
            const frameDimensions = await this.getImageDimensions(localPath);
            
            frames.push({
              timestamp,
              filename,
              localPath,
              size: frameDimensions
            });
          } catch (error) {
            console.error(`Failed to extract frame at ${timestamp}s:`, error);
            // Continue with other frames
          }
        }

        updateProgress('completed', 100, 'Frame extraction completed');
        return frames;
      },
      { userId, operation: 'frame-extraction' }
    );
  }

  /**
   * Extract frames and upload to storage
   */
  async extractAndUploadFrames(
    videoPath: string,
    videoId: string,
    options: FrameExtractionOptions = {}
  ): Promise<FrameAnalysis> {
    const frames = await this.extractFrames(videoPath, options);
    const metadata = await this.getVideoMetadata(videoPath);
    
    // Upload frames to Supabase storage
    const uploadedFrames: ExtractedFrame[] = [];
    
    for (const frame of frames) {
      try {
        const publicUrl = await this.uploadFrameToStorage(frame, videoId);
        uploadedFrames.push({
          ...frame,
          publicUrl
        });
      } catch (error) {
        console.error(`Failed to upload frame ${frame.filename}:`, error);
        // Continue with other frames
      }
    }

    // Clean up local files
    await this.cleanupLocalFrames(frames);

    const analysis: FrameAnalysis = {
      videoId,
      frames: uploadedFrames,
      totalFrames: uploadedFrames.length,
      videoDuration: metadata.duration,
      extractionMethod: options.timestamps ? 'timestamps' : options.count ? 'count' : 'interval',
      createdAt: new Date()
    };

    // Save frame analysis to database
    await this.saveFrameAnalysis(analysis);

    return analysis;
  }

  /**
   * Extract key frames for video summary
   */
  async extractKeyFrames(
    videoPath: string,
    videoId: string,
    keyMoments: number[] = []
  ): Promise<ExtractedFrame[]> {
    const metadata = await this.getVideoMetadata(videoPath);
    const duration = metadata.duration;
    
    // Default key moments: beginning, 25%, 50%, 75%, and end
    const defaultMoments = [
      duration * 0.1,  // 10% in
      duration * 0.25, // 25%
      duration * 0.5,  // 50%
      duration * 0.75, // 75%
      duration * 0.9   // 90%
    ];
    
    const timestamps = keyMoments.length > 0 ? keyMoments : defaultMoments;
    
    const analysis = await this.extractAndUploadFrames(videoPath, videoId, {
      timestamps,
      size: '800x600',
      format: 'jpg',
      quality: 1 // High quality for key frames
    });
    
    return analysis.frames;
  }

  /**
   * Extract single frame at specific timestamp
   */
  private async extractSingleFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string,
    size: string,
    quality: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .size(size)
        .outputOptions([
          '-q:v', quality.toString(),
          '-update', '1'
        ])
        .on('end', () => resolve())
        .on('error', (err: any) => reject(new Error(`Frame extraction failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(videoPath: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }
        
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        
        resolve({
          duration,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0
        });
      });
    });
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(imagePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get image dimensions: ${err.message}`));
          return;
        }
        
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        
        resolve({
          width: videoStream?.width || 0,
          height: videoStream?.height || 0
        });
      });
    });
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
   * Upload frame to Supabase storage
   */
  private async uploadFrameToStorage(frame: ExtractedFrame, videoId: string): Promise<string> {
    const frameBuffer = await fsPromises.readFile(frame.localPath);
    const storagePath = `frames/${videoId}/${frame.filename}`;
    
    const { data, error } = await this.supabase.storage
      .from('video-files')
      .upload(storagePath, frameBuffer, {
        contentType: frame.filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
      });
    
    if (error) {
      throw new Error(`Failed to upload frame: ${error.message}`);
    }
    
    const { data: urlData } = this.supabase.storage
      .from('video-files')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  }

  /**
   * Save frame analysis to database
   */
  private async saveFrameAnalysis(analysis: FrameAnalysis): Promise<void> {
    const { error } = await this.supabase
      .from('video_frames')
      .insert({
        video_summary_id: analysis.videoId,
        total_frames: analysis.totalFrames,
        video_duration: analysis.videoDuration,
        extraction_method: analysis.extractionMethod,
        frames_data: analysis.frames,
        created_at: analysis.createdAt.toISOString()
      });
    
    if (error) {
      console.error('Failed to save frame analysis:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Clean up local frame files
   */
  private async cleanupLocalFrames(frames: ExtractedFrame[]): Promise<void> {
    for (const frame of frames) {
      try {
        await fsPromises.access(frame.localPath);
        await fsPromises.unlink(frame.localPath);
      } catch (error) {
        console.error(`Failed to cleanup frame ${frame.filename}:`, error);
        // Continue cleanup
      }
    }
  }

  /**
   * Get frame analysis by video ID
   */
  async getFrameAnalysis(videoId: string): Promise<FrameAnalysis | null> {
    const { data, error } = await this.supabase
      .from('video_frames')
      .select('*')
      .eq('video_summary_id', videoId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      videoId: data.video_summary_id,
      frames: data.frames_data || [],
      totalFrames: data.total_frames,
      videoDuration: data.video_duration,
      extractionMethod: data.extraction_method,
      createdAt: new Date(data.created_at)
    };
  }

  /**
   * Extract thumbnail from video
   */
  async extractThumbnail(
    videoPath: string,
    timestamp: number = 10, // 10 seconds in
    size: string = '320x240'
  ): Promise<string> {
    const thumbnailPath = path.join(this.tempDir, `thumbnail_${Date.now()}.jpg`);
    
    await this.extractSingleFrame(videoPath, timestamp, thumbnailPath, size, 2);
    
    return thumbnailPath;
  }

  /**
   * Create video preview with multiple frames
   */
  async createVideoPreview(
    videoPath: string,
    videoId: string,
    frameCount: number = 9
  ): Promise<ExtractedFrame[]> {
    const analysis = await this.extractAndUploadFrames(videoPath, videoId, {
      count: frameCount,
      size: '320x240',
      format: 'jpg',
      quality: 3
    });
    
    return analysis.frames;
  }
}

export { FrameExtractionService };
export default FrameExtractionService;