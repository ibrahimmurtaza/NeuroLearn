import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import multer from 'multer';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VideoMetadata {
  filename: string;
  duration: number;
  format: string;
  size: number;
  resolution: string;
  bitrate: number;
  fps: number;
}

interface ProcessingResult {
  id: string;
  title: string;
  summary: string;
  duration: string;
  thumbnailUrl?: string;
  transcriptText: string;
}

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Extract video metadata using FFmpeg
async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    // Use full path to ffprobe on Windows
    const ffprobePath = process.platform === 'win32' 
      ? 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffprobe.exe'
      : 'ffprobe';
    
    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to extract video metadata'));
        return;
      }

      try {
        const metadata = JSON.parse(output);
        const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
        const format = metadata.format;

        resolve({
          filename: path.basename(filePath),
          duration: parseFloat(format.duration),
          format: format.format_name,
          size: parseInt(format.size),
          resolution: `${videoStream.width}x${videoStream.height}`,
          bitrate: parseInt(format.bit_rate) || 0,
          fps: eval(videoStream.r_frame_rate) || 0
        });
      } catch (error) {
        reject(new Error('Failed to parse video metadata'));
      }
    });

    ffprobe.on('error', (error) => {
      reject(error);
    });
  });
}

// Extract audio from video using FFmpeg
async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use full path to ffmpeg on Windows
    const ffmpegPath = process.platform === 'win32' 
      ? 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe'
      : (ffmpeg || 'ffmpeg');
    
    const ffmpegProcess = spawn(ffmpegPath, [
      '-i', videoPath,
      '-vn', // No video
      '-acodec', 'libmp3lame',
      '-ab', '192k',
      '-ar', '44100',
      '-y', // Overwrite output file
      outputPath
    ]);

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(error);
    });
  });
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const audioFile = await fs.readFile(audioPath);
    
    const response = await openai.audio.transcriptions.create({
      file: new File([audioFile], path.basename(audioPath), { type: 'audio/mp3' }),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });

    return response;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// Generate AI summary
async function generateSummary(transcript: string, metadata: VideoMetadata): Promise<string> {
  try {
    const prompt = `Please provide a comprehensive summary of this uploaded video:

Filename: ${metadata.filename}
Duration: ${Math.round(metadata.duration)} seconds
Format: ${metadata.format}
Resolution: ${metadata.resolution}

Transcript:
${transcript}

Please provide:
1. A brief overview (2-3 sentences)
2. Key points and main topics discussed
3. Important insights or conclusions
4. Any actionable takeaways

Format the summary in a clear, structured way.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || 'Summary generation failed';
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error('Failed to generate AI summary');
  }
}

// Upload file to Supabase Storage
async function uploadToStorage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const fileExt = path.extname(filename);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error } = await supabase.storage
      .from('video-files')
      .upload(filePath, buffer, {
        contentType: 'video/*',
        upsert: false
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('video-files')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    throw new Error('Failed to upload video file');
  }
}

// Save to database
async function saveToDatabase(
  userId: string,
  metadata: VideoMetadata,
  transcript: string,
  summary: string,
  videoUrl: string
): Promise<any> {
  try {
    // Save video summary (set user_id to null for testing if user doesn't exist)
    const { data: summaryData, error: summaryError } = await supabase
      .from('video_summaries')
      .insert({
        user_id: null, // Temporarily set to null for testing
        title: metadata.filename, // Required field
        video_url: videoUrl,
        video_title: metadata.filename,
        video_description: `Uploaded video file - ${metadata.format} format`,
        duration: `${Math.round(metadata.duration)}s`,
        summary: summary, // Use 'summary' not 'summary_content'
        processing_status: 'completed',
        source_type: 'upload',
        file_size: metadata.size,
        resolution: metadata.resolution
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    // Save transcript as individual segments (for consistency with YouTube processing)
    // Since we have full transcript text, we'll create one segment
    const { error: transcriptError } = await supabase
      .from('video_transcripts')
      .insert({
        video_summary_id: summaryData.id,
        start_time: 0,
        end_time: metadata.duration,
        text: transcript,
        confidence: null, // Whisper doesn't provide confidence in text mode
        speaker: null // No speaker identification for uploaded videos
      });

    if (transcriptError) throw transcriptError;

    return summaryData;
  } catch (error) {
    console.error('Error saving to database:', error);
    throw new Error('Failed to save video data');
  }
}

// Process video details (transcript segments and frames)
async function processVideoDetails(videoSummaryId: string, videoUrl: string, transcript: string) {
  try {
    // Process transcript into segments using OpenAI Whisper for better segmentation
    const tempVideoPath = await downloadVideoFile(videoUrl);
    const audioPath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);
    
    // Extract audio using the existing function
    await extractAudio(tempVideoPath, audioPath);
    
    // Get detailed transcript with timestamps
    const audioFile = await fs.readFile(audioPath);
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile], path.basename(audioPath), { type: 'audio/mp3' }),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });
    
    // Delete existing basic transcript segment
    await supabase
      .from('video_transcripts')
      .delete()
      .eq('video_summary_id', videoSummaryId);
    
    // Insert detailed transcript segments
    if (transcription.segments && transcription.segments.length > 0) {
      const transcriptInserts = transcription.segments.map((segment, index) => ({
        video_summary_id: videoSummaryId,
        start_time: segment.start,
        end_time: segment.end,
        text: segment.text.trim(),
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.95,
        speaker: null
      }));
      
      await supabase
        .from('video_transcripts')
        .insert(transcriptInserts);
    }
    
    // Extract and process key frames
    await extractAndProcessFrames(videoSummaryId, tempVideoPath);
    
    // Clean up temporary files
    await fs.unlink(tempVideoPath);
    await fs.unlink(audioPath);
    
  } catch (error) {
    console.error('Error processing video details:', error);
    throw error;
  }
}

// Extract and process video frames
async function extractAndProcessFrames(videoSummaryId: string, videoPath: string) {
  try {
    console.log(`Starting frame extraction for video: ${videoSummaryId}`);
    const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
    await fs.mkdir(framesDir, { recursive: true });
    console.log(`Created frames directory: ${framesDir}`);
    
    // Extract frames at 30-second intervals
    const ffmpegPath = process.platform === 'win32' 
      ? 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe'
      : 'ffmpeg';
    
    const ffmpegCommand = `"${ffmpegPath}" -i "${videoPath}" -vf "fps=1/30" -q:v 2 "${framesDir}/frame_%03d.jpg"`;
    console.log(`Executing ffmpeg command: ${ffmpegCommand}`);
    
    await execAsync(ffmpegCommand);
    
    const frameFiles = (await fs.readdir(framesDir)).filter(f => f.endsWith('.jpg'));
    console.log(`Found ${frameFiles.length} frame files: ${frameFiles.join(', ')}`);
    const frameInserts = [];
    
    for (let i = 0; i < Math.min(frameFiles.length, 10); i++) {
      const frameFile = frameFiles[i];
      const framePath = path.join(framesDir, frameFile);
      const timestamp = i * 30; // 30-second intervals
      
      console.log(`Processing frame ${i + 1}/${frameFiles.length}: ${frameFile} at timestamp ${timestamp}s`);
      
      // Upload frame to storage
      const frameBuffer = await fs.readFile(framePath);
      const fileName = `${videoSummaryId}/frame_${timestamp}s.jpg`;
      
      console.log(`Uploading frame to storage: ${fileName}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-frames')
        .upload(fileName, frameBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`Upload error for ${fileName}:`, uploadError);
      } else {
        console.log(`Successfully uploaded frame: ${fileName}`);
      }
      
      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('video-frames')
          .getPublicUrl(fileName);
        
        frameInserts.push({
          video_summary_id: videoSummaryId,
          timestamp: timestamp,
          frame_path: publicUrl,
          frame_type: 'keyframe',
          description: `Frame at ${timestamp}s`
        });
      }
    }
    
    console.log(`Prepared ${frameInserts.length} frames for database insertion`);
    if (frameInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('video_frames')
        .insert(frameInserts);
      
      if (insertError) {
        console.error('Database insertion error:', insertError);
      } else {
        console.log(`Successfully inserted ${frameInserts.length} frames into database`);
      }
    }
    
    // Clean up temporary frames directory
    await fs.rm(framesDir, { recursive: true, force: true });
    
  } catch (error) {
    console.error('Error extracting frames:', error);
    // Don't throw error to avoid failing the entire upload
  }
}

// Download video file temporarily
async function downloadVideoFile(videoUrl: string): Promise<string> {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const tempPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
  fs.writeFileSync(tempPath, Buffer.from(buffer));
  
  return tempPath;
}

// Clean up temporary files
async function cleanupFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error);
    }
  }
}

export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];
  const errorHandler = ErrorHandlingService.getInstance();
  const operationId = `upload-${Date.now()}`;
  
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        'Video file and userId are required',
        { severity: ErrorSeverity.LOW }
      );
      return NextResponse.json(
        { error: error.message, errorId: error.id },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        'Invalid file type. Only video files are allowed.',
        { 
          severity: ErrorSeverity.LOW,
          context: { userId, operation: 'file-validation' },
          details: { fileType: file.type, allowedTypes }
        }
      );
      return NextResponse.json(
        { error: error.message, errorId: error.id },
        { status: 400 }
      );
    }

    // Process with error handling and progress tracking
    const result = await errorHandler.executeWithProgress(
      operationId,
      async (updateProgress) => {
        updateProgress('upload', 5, 'Saving uploaded file');
        
        // Save uploaded file temporarily
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempVideoPath = path.join(process.cwd(), 'temp', `${uuidv4()}_${file.name}`);
        const tempAudioPath = path.join(process.cwd(), 'temp', `${uuidv4()}_audio.mp3`);
        
        tempFiles.push(tempVideoPath, tempAudioPath);

        // Ensure temp directory exists
        await fs.mkdir(path.dirname(tempVideoPath), { recursive: true });
        await fs.writeFile(tempVideoPath, buffer);

        try {
          updateProgress('metadata', 15, 'Extracting video metadata');
          
          // Extract video metadata
          const metadata = await extractVideoMetadata(tempVideoPath);

          updateProgress('audio', 30, 'Extracting audio from video');
          
          // Extract audio from video
          await extractAudio(tempVideoPath, tempAudioPath);

          updateProgress('transcription', 50, 'Transcribing audio content');
          
          // Transcribe audio
          const transcript = await transcribeAudio(tempAudioPath);

          updateProgress('summary', 70, 'Generating AI summary');
          
          // Generate AI summary
          const summary = await generateSummary(transcript, metadata);

          updateProgress('storage', 85, 'Uploading to cloud storage');
          
          // Upload video to storage
          const videoUrl = await uploadToStorage(buffer, file.name);

          updateProgress('database', 95, 'Saving to database');
          
          // Save to database
          const savedData = await saveToDatabase(userId, metadata, transcript, summary, videoUrl);

          updateProgress('processing', 90, 'Processing transcript and frames');
          
          // Trigger additional processing for transcript segments and frames
          try {
            await processVideoDetails(savedData.id, videoUrl, transcript);
          } catch (processingError) {
            console.error('Error in additional processing:', processingError);
            // Don't fail the upload if additional processing fails
          }

          updateProgress('cleanup', 98, 'Cleaning up temporary files');
          
          // Clean up temporary files
          await cleanupFiles(tempFiles);
          
          updateProgress('completed', 100, 'Video processing completed successfully');
          
          return {
            success: true,
            data: {
              id: savedData.id,
              title: metadata.filename,
              summary,
              duration: `${Math.round(metadata.duration)}s`,
              transcriptText: transcript,
              videoUrl
            }
          };
          
        } catch (processingError) {
          // Clean up temporary files on error
          await cleanupFiles(tempFiles);
          throw processingError;
        }
      },
      { userId, operation: 'video-upload-processing' }
    );

    return NextResponse.json(result);

  } catch (error: any) {
    const processingError = errorHandler.createError(
      ErrorType.PROCESSING_ERROR,
      `Failed to process video upload: ${error.message}`,
      {
        severity: ErrorSeverity.HIGH,
        context: { userId: 'unknown', operation: 'video-upload-processing' },
        originalError: error
      }
    );
    
    console.error('Video upload processing error:', error);
    
    // Clean up temporary files on error
    await cleanupFiles(tempFiles);
    
    return NextResponse.json(
      { 
        error: processingError.message, 
        errorId: processingError.id,
        details: error instanceof Error ? error.message : 'Processing failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('video_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'upload')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching uploaded videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}