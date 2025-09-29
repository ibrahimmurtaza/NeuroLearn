import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { authenticateUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-utils';
import { checkVideoOwnership } from '@/lib/video-utils';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface ExtractFramesRequest {
  videoSummaryId: string;
  userId: string;
  options: {
    frameInterval: number; // seconds
    maxFrames?: number;
    startTime?: number; // seconds
    endTime?: number; // seconds
    generateDescriptions?: boolean;
    frameSize?: {
      width: number;
      height: number;
    };
  };
}

interface FrameResponse {
  id: string;
  timestamp: number;
  frame_url: string;
  description?: string;
  analysisData?: {
    objects?: string[];
    text?: string;
    emotions?: string[];
    colors?: string[];
  };
}

interface ExtractFramesResponse {
  success: boolean;
  frames: FrameResponse[];
  totalFrames: number;
  processingTime: number;
}

// Download video from Supabase storage to temporary file
async function downloadVideoFile(videoUrl: string): Promise<string> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error('Failed to download video file');
    }
    
    const buffer = await response.arrayBuffer();
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);
    
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));
    return tempFilePath;
  } catch (error) {
    console.error('Error downloading video file:', error);
    throw new Error('Failed to download video file');
  }
}

// Extract frames from video at specified intervals
async function extractVideoFrames(
  videoPath: string,
  options: ExtractFramesRequest['options']
): Promise<Array<{timestamp: number, frameBuffer: Buffer}>> {
  const frames: Array<{timestamp: number, frameBuffer: Buffer}> = [];
  const tempDir = os.tmpdir();
  
  try {
    const { frameInterval, maxFrames = 50, startTime = 0, endTime, frameSize } = options;
    
    // Get video duration if endTime not specified
    let videoDuration = endTime;
    if (!videoDuration) {
      // Use full path to ffprobe
      const ffprobePath = process.platform === 'win32' 
        ? 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffprobe.exe'
        : 'ffprobe';
      
      const { stdout } = await execAsync(
        `"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
      );
      videoDuration = parseFloat(stdout.trim());
    }
    
    const totalDuration = videoDuration - startTime;
    const frameCount = Math.min(Math.floor(totalDuration / frameInterval), maxFrames);
    
    // Use full path to ffmpeg
    const ffmpegPath = process.platform === 'win32' 
      ? 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe'
      : 'ffmpeg';
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = startTime + (i * frameInterval);
      const framePath = path.join(tempDir, `frame_${timestamp}_${Date.now()}.jpg`);
      
      // Extract frame using ffmpeg with full path
      await execAsync(
        `"${ffmpegPath}" -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`
      );
      
      if (fs.existsSync(framePath)) {
        let frameBuffer = fs.readFileSync(framePath);
        
        // Optimize frame using Sharp
        const sharpInstance = sharp(frameBuffer);

        
        if (frameSize) {
          sharpInstance.resize(frameSize.width, frameSize.height, {
            fit: 'inside',
            withoutEnlargement: true
          });
        } else {
          sharpInstance.resize(800, 600, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
        
        const optimizedFrame = await sharpInstance
          .jpeg({ quality: 80 })
          .toBuffer();
        
        frames.push({
          timestamp,
          frameBuffer: optimizedFrame
        });
        
        // Clean up temporary file
        fs.unlinkSync(framePath);
      }
    }
    
    return frames;
  } catch (error) {
    console.error('Error extracting frames:', error);
    throw new Error('Failed to extract frames from video');
  }
}

// Upload frame to Supabase Storage
async function uploadFrame(
  frameBuffer: Buffer,
  fileName: string,
  videoSummaryId: string
): Promise<string | null> {
  try {
    const filePath = `${videoSummaryId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('video-frames')
      .upload(filePath, frameBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading frame:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-frames')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading frame:', error);
    return null;
  }
}

// Generate frame description using AI
async function generateFrameDescription(frameBuffer: Buffer): Promise<{
  description: string;
  analysisData: {
    objects: string[];
    text: string;
    emotions: string[];
    colors: string[];
  };
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Convert buffer to base64
    const base64Image = frameBuffer.toString('base64');
    
    const prompt = `
      Analyze this video frame and provide:
      1. A brief description of what's happening in the frame
      2. List of objects/people visible (comma-separated)
      3. Any text visible in the frame
      4. Dominant emotions or mood (comma-separated)
      5. Dominant colors (comma-separated)
      
      Format your response as JSON:
      {
        "description": "Brief description",
        "objects": ["object1", "object2"],
        "text": "visible text",
        "emotions": ["emotion1", "emotion2"],
        "colors": ["color1", "color2"]
      }
    `;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    try {
      const analysisData = JSON.parse(text);
      return {
        description: analysisData.description || 'Frame analysis',
        analysisData: {
          objects: analysisData.objects || [],
          text: analysisData.text || '',
          emotions: analysisData.emotions || [],
          colors: analysisData.colors || []
        }
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        description: 'Video frame content',
        analysisData: {
          objects: [],
          text: '',
          emotions: [],
          colors: []
        }
      };
    }
  } catch (error) {
    console.error('Error generating frame description:', error);
    return {
      description: 'Video frame content',
      analysisData: {
        objects: [],
        text: '',
        emotions: [],
        colors: []
      }
    };
  }
}

// POST /api/summarize/video/frames - Extract frames from a video
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabaseClient = createRouteHandlerClient({ cookies });
    const startTime = Date.now();
    
    const { videoId, frameCount = 5 } = await request.json();
    const videoSummaryId = videoId; // Fix variable name mismatch
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabase, userId, videoId);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video');
    }
    
    // Verify video summary exists and belongs to user
    const { data: videoSummary, error: summaryError } = await supabase
      .from('video_summaries')
      .select('*')
      .eq('id', videoSummaryId)
      .eq('user_id', userId)
      .single();
    
    if (summaryError || !videoSummary) {
      return NextResponse.json(
        { error: 'Video summary not found or access denied' },
        { status: 404 }
      );
    }
    
    if (!videoSummary.video_url) {
      return NextResponse.json(
        { error: 'Video file not available for frame extraction' },
        { status: 400 }
      );
    }

    // Define extraction options
    const options = {
      frameInterval: Math.max(1, Math.floor((videoSummary.duration || 60) / frameCount)),
      maxFrames: frameCount,
      generateDescriptions: true
    };
    
    // Download video file temporarily
    const tempVideoPath = await downloadVideoFile(videoSummary.video_url);
    
    try {
      // Extract frames
      const extractedFrames = await extractVideoFrames(tempVideoPath, options);
      
      const frameResponses: FrameResponse[] = [];
      
      // Process each frame
      for (const frame of extractedFrames) {
        const frameId = `frame_${frame.timestamp}_${Date.now()}`;
        const fileName = `${frameId}.jpg`;
        
        // Upload frame to storage
        const frameUrl = await uploadFrame(frame.frameBuffer, fileName, videoSummaryId);
        
        if (frameUrl) {
          let description = `Frame at ${Math.floor(frame.timestamp / 60)}:${(frame.timestamp % 60).toString().padStart(2, '0')}`;
          let analysisData = undefined;
          
          // Generate AI description if requested
          if (options.generateDescriptions) {
            const aiAnalysis = await generateFrameDescription(frame.frameBuffer);
            description = aiAnalysis.description;
            analysisData = aiAnalysis.analysisData;
          }
          
          const frameResponse: FrameResponse = {
            id: frameId,
            timestamp: frame.timestamp,
            frame_url: frameUrl,
            description,
            analysisData
          };
          
          frameResponses.push(frameResponse);
          
          // Save frame to database
          await supabase
            .from('video_frames')
            .insert({
              id: frameId,
              video_summary_id: videoSummaryId,
              timestamp: frame.timestamp,
              frame_url: frameUrl,
              description,
              analysis_data: analysisData
            });
        }
      }
      
      // Clean up temporary video file
      fs.unlinkSync(tempVideoPath);
      
      const processingTime = Date.now() - startTime;
      
      const response: ExtractFramesResponse = {
        success: true,
        frames: frameResponses,
        totalFrames: frameResponses.length,
        processingTime
      };
      
      return NextResponse.json(response);
      
    } catch (processingError) {
      // Clean up temporary file
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      
      console.error('Frame extraction error:', processingError);
      return NextResponse.json(
        { error: 'Failed to extract frames from video' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Frames API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/summarize/video/frames - Get frames for a video summary
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    const { searchParams } = new URL(request.url);
    const videoSummaryId = searchParams.get('videoId');
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!videoSummaryId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabase, userId, videoSummaryId);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video');
    }
    
    // Verify video summary exists and belongs to user
    const { data: videoSummary, error: summaryError } = await supabase
      .from('video_summaries')
      .select('id')
      .eq('id', videoSummaryId)
      .eq('user_id', userId)
      .single();
    
    if (summaryError || !videoSummary) {
      return NextResponse.json(
        { error: 'Video summary not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get frames
    const { data: framesData, error: framesError } = await supabase
      .from('video_frames')
      .select('*')
      .eq('video_summary_id', videoSummaryId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (framesError) {
      console.error('Error fetching frames:', framesError);
      return NextResponse.json(
        { error: 'Failed to fetch frames' },
        { status: 500 }
      );
    }
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('video_frames')
      .select('*', { count: 'exact', head: true })
      .eq('video_summary_id', videoSummaryId);
    
    const frames: FrameResponse[] = (framesData || []).map(frame => ({
      id: frame.id,
      timestamp: frame.timestamp,
      frame_url: frame.frame_path,
      description: frame.description,
      analysisData: frame.analysis_data
    }));
    
    return NextResponse.json({
      success: true,
      frames,
      totalFrames: count || 0,
      hasMore: (offset + limit) < (count || 0)
    });
    
  } catch (error) {
    console.error('GET frames error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}