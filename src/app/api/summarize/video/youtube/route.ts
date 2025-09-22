import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';
import { ErrorHandlingService, ErrorType, ErrorSeverity } from '@/services/errorHandlingService';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
}

interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

// Validate YouTube URL and extract video ID
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Get basic video metadata with enhanced extraction methods
async function getVideoMetadata(videoId: string): Promise<YouTubeVideoInfo | null> {
  try {
    // Try to fetch metadata using YouTube oEmbed API (no API key required)
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    try {
      const response = await fetch(oEmbedUrl);
      if (response.ok) {
        const data = await response.json();
        return {
          videoId,
          title: data.title || `YouTube Video ${videoId}`,
          description: 'Video processed via transcript',
          duration: '0', // Will be updated after transcript processing
          channelTitle: data.author_name || 'Unknown Channel',
          publishedAt: new Date().toISOString(),
          thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
      }
    } catch (oEmbedError) {
      console.log('oEmbed failed, trying alternative method:', oEmbedError);
    }

    // Fallback: Try to scrape basic info from YouTube page
    try {
      const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const pageResponse = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        
        // Extract title from page title tag
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        let title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : `YouTube Video ${videoId}`;
        
        // Extract channel name from meta tags
        const channelMatch = html.match(/<meta name="author" content="([^"]+)"/);
        const channelTitle = channelMatch ? channelMatch[1] : 'Unknown Channel';
        
        return {
          videoId,
          title,
          description: 'Video processed via transcript',
          duration: '0',
          channelTitle,
          publishedAt: new Date().toISOString(),
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        };
      }
    } catch (scrapeError) {
      console.log('Page scraping failed:', scrapeError);
    }

    // Final fallback: return basic metadata
    return {
      videoId,
      title: `YouTube Video ${videoId}`,
      description: 'Video processed via transcript',
      duration: '0',
      channelTitle: 'Unknown Channel',
      publishedAt: new Date().toISOString(),
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

// Download transcript from YouTube using improved methods
async function getVideoTranscript(videoId: string): Promise<TranscriptItem[]> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    console.log(`Attempting to fetch transcript for video ID: ${videoId}`);
    
    // Try yt-dlp first as it's more reliable for server environments
    const ytDlpTranscript = await extractTranscriptWithYtDlp(videoUrl);
    if (ytDlpTranscript.length > 0) {
      console.log(`yt-dlp transcript fetched successfully. Items count: ${ytDlpTranscript.length}`);
      return ytDlpTranscript.map(item => ({
        text: item.text,
        start: item.start_time,
        duration: item.end_time - item.start_time
      }));
    }
    
    // Fallback to youtube-transcript package
    console.log('yt-dlp failed, trying youtube-transcript package...');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(`YouTube transcript fetched successfully. Items count: ${transcript.length}`);
    
    if (transcript.length === 0) {
      console.warn(`No transcript items found for video ID: ${videoId}`);
      return [];
    }
    
    const processedTranscript = transcript.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration / 1000 // Convert to seconds
    }));
    
    console.log(`Processed transcript with ${processedTranscript.length} items`);
    return processedTranscript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      videoId,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return empty array instead of throwing to allow processing to continue
    return [];
  }
}

// Extract transcript using yt-dlp as primary method
async function extractTranscriptWithYtDlp(videoUrl: string): Promise<Array<{
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
}>> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Use yt-dlp to extract subtitles in VTT format
    const tempDir = os.tmpdir();
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
      try {
        if (await fs.access(vttFile).then(() => true).catch(() => false)) {
          vttContent = await fs.readFile(vttFile, 'utf8');
          await fs.unlink(vttFile); // Clean up
          break;
        }
      } catch (fileError) {
        console.log(`Could not read VTT file ${vttFile}:`, fileError);
      }
    }
    
    if (!vttContent) {
      throw new Error('No VTT subtitle files found');
    }
    
    console.log('VTT content length:', vttContent.length);
    
    // Parse VTT content
    const segments = parseVTTContent(vttContent);
    console.log('Parsed segments:', segments.length);
    
    return segments;
  } catch (error) {
    console.error('yt-dlp transcript extraction failed:', error);
    return [];
  }
}

// Parse VTT content into transcript segments
function parseVTTContent(vttContent: string): Array<{
  start_time: number;
  end_time: number;
  text: string;
  confidence?: number;
}> {
  const lines = vttContent.split('\n');
  const segments = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for timestamp lines (format: 00:00:00.000 --> 00:00:05.000)
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const startTime = parseVTTTimestamp(startStr);
      const endTime = parseVTTTimestamp(endStr);
      
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

// Parse VTT timestamp to seconds
function parseVTTTimestamp(timestamp: string): number {
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

// Generate AI summary
async function generateSummary(transcript: string, metadata: YouTubeVideoInfo): Promise<string> {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, generating basic summary');
      return `Summary of "${metadata.title}" by ${metadata.channelTitle}:\n\nThis video has been processed and the transcript is available. A detailed AI-generated summary requires OpenAI API configuration.`;
    }

    // Check if transcript is too short
    if (transcript.length < 50) {
      return `Summary of "${metadata.title}" by ${metadata.channelTitle}:\n\nThe video transcript is too short to generate a meaningful summary. The video may not have captions available or may be very brief.`;
    }

    const prompt = `Please provide a comprehensive summary of this YouTube video:

Title: ${metadata.title}
Channel: ${metadata.channelTitle}
Duration: ${metadata.duration}

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

    const generatedSummary = response.choices[0]?.message?.content;
    
    if (!generatedSummary || generatedSummary.trim().length === 0) {
      return `Summary of "${metadata.title}" by ${metadata.channelTitle}:\n\nUnable to generate AI summary. The transcript has been processed and saved.`;
    }

    return generatedSummary;
  } catch (error) {
    console.error('Error generating summary:', error);
    // Return a fallback summary instead of throwing an error
    return `Summary of "${metadata.title}" by ${metadata.channelTitle}:\n\nAn error occurred while generating the AI summary. The video transcript has been processed and saved successfully.`;
  }
}

// Extract and process video frames from YouTube URL
async function extractAndProcessFrames(videoSummaryId: string, youtubeUrl: string) {
  try {
    console.log('Starting frame extraction for YouTube video:', youtubeUrl);
    
    const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
    console.log('Creating frames directory:', framesDir);
    await fs.mkdir(framesDir, { recursive: true });
    
    // Use yt-dlp to download video and extract frames
    // Extract frames at 30-second intervals using yt-dlp + ffmpeg
    const command = `yt-dlp -f "best[height<=720]" --no-playlist "${youtubeUrl}" -o - | ffmpeg -i pipe:0 -vf "fps=1/30" -q:v 2 "${framesDir}/frame_%03d.jpg"`;
    
    console.log('Executing frame extraction command...');
    await execAsync(command);
    
    const frameFiles = (await fs.readdir(framesDir)).filter(f => f.endsWith('.jpg'));
    console.log(`Found ${frameFiles.length} frame files:`, frameFiles);
    
    const frameInserts = [];
    
    for (let i = 0; i < Math.min(frameFiles.length, 10); i++) {
      const frameFile = frameFiles[i];
      const framePath = path.join(framesDir, frameFile);
      const timestamp = i * 30; // 30-second intervals
      
      console.log(`Processing frame ${i + 1}/${Math.min(frameFiles.length, 10)}: ${frameFile} at ${timestamp}s`);
      
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
        console.error(`Error uploading frame ${frameFile}:`, uploadError);
        continue;
      }
      
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('video-frames')
          .getPublicUrl(fileName);
        
        console.log(`Frame uploaded successfully, public URL: ${publicUrl}`);
        
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
      console.log('Inserting frames into database...');
      const { error: frameError } = await supabase
        .from('video_frames')
        .insert(frameInserts);
      
      if (frameError) {
        console.error('Error saving frames to database:', frameError);
      } else {
        console.log(`Successfully saved ${frameInserts.length} frames to database`);
      }
    }
    
    // Cleanup temporary files
    try {
      await fs.rmdir(framesDir, { recursive: true });
      console.log('Cleaned up temporary frames directory');
    } catch (cleanupError) {
      console.error('Error cleaning up frames directory:', cleanupError);
    }
    
    return frameInserts.length;
  } catch (error) {
    console.error('Error extracting frames:', error);
    // Don't throw error as frame extraction is optional
    return 0;
  }
}

// Save to database
async function saveToDatabase(
  userId: string,
  metadata: YouTubeVideoInfo,
  transcript: TranscriptItem[],
  summary: string
) {
  try {
    // Save video summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('video_summaries')
      .insert({
        user_id: userId, // Use the actual userId instead of null
        title: metadata.title, // Required field
        video_url: `https://www.youtube.com/watch?v=${metadata.videoId}`,
        video_title: metadata.title,
        video_description: metadata.description,
        channel_name: metadata.channelTitle,
        duration: parseInt(metadata.duration) || 0, // Convert string to integer
        thumbnail_url: metadata.thumbnailUrl,
        summary: summary, // Use 'summary' not 'summary_content'
        processing_status: 'completed',
        source_type: 'youtube'
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    // Save transcript segments
    const transcriptSegments = transcript.map(item => ({
      video_summary_id: summaryData.id,
      start_time: item.start,
      end_time: item.start + item.duration,
      text: item.text,
      confidence: null, // YouTube transcripts don't provide confidence scores
      speaker: null // YouTube transcripts don't identify speakers
    }));

    const { error: transcriptError } = await supabase
      .from('video_transcripts')
      .insert(transcriptSegments);

    if (transcriptError) throw transcriptError;

    return summaryData;
  } catch (error) {
    console.error('Error saving to database:', error);
    throw new Error('Failed to save video data');
  }
}

export async function POST(request: NextRequest) {
  const operationId = `youtube-${Date.now()}`;
  const errorHandler = ErrorHandlingService.getInstance();

  try {
    // Set up authenticated Supabase client
    const cookieStore = cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, options } = body;
    const userId = user.id; // Use authenticated user ID instead of request body

    if (!url) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        'URL is required',
        { severity: ErrorSeverity.LOW }
      );
      return NextResponse.json(
        { error: error.message, errorId: error.id },
        { status: 400 }
      );
    }

    // Validate and extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      const error = errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        'Invalid YouTube URL',
        { severity: ErrorSeverity.LOW, context: { userId, operation: 'youtube-validation' } }
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
        updateProgress('metadata', 10, 'Extracting video metadata');
        
        // Get video metadata
        const metadata = await getVideoMetadata(videoId);
        if (!metadata) {
          throw new Error('Video not found or unavailable');
        }

        updateProgress('transcript', 30, 'Fetching video transcript');
        
        // Get transcript
        const transcript = await getVideoTranscript(videoId);
        const transcriptText = transcript.map(item => item.text).join(' ');
        
        console.log(`Transcript processing result:`, {
          transcriptItemsCount: transcript.length,
          transcriptTextLength: transcriptText.length,
          transcriptPreview: transcriptText.substring(0, 200) + (transcriptText.length > 200 ? '...' : '')
        });

        updateProgress('summary', 60, 'Generating AI summary');
        
        // Generate AI summary
        const summary = await generateSummary(transcriptText, metadata);

        updateProgress('database', 80, 'Saving to database');
        
        // Save to database
        const savedData = await saveToDatabase(userId, metadata, transcript, summary);

        updateProgress('frames', 90, 'Extracting video frames');
        
        // Extract frames (optional, don't fail if this doesn't work)
        const frameCount = await extractAndProcessFrames(savedData.id, url);
        console.log(`Frame extraction completed. Extracted ${frameCount} frames.`);

        updateProgress('completed', 100, 'Processing completed successfully');
        
        return {
          success: true,
          data: {
            id: savedData.id,
            title: metadata.title,
            summary,
            duration: metadata.duration,
            thumbnailUrl: metadata.thumbnailUrl,
            channelTitle: metadata.channelTitle
          }
        };
      },
      { userId, operation: 'youtube-processing' }
    );

    return NextResponse.json(result);

  } catch (error: any) {
    const processingError = errorHandler.createError(
      ErrorType.PROCESSING_ERROR,
      `Failed to process YouTube video: ${error.message}`,
      {
        severity: ErrorSeverity.HIGH,
        context: { userId, operation: 'youtube-processing' },
        originalError: error
      }
    );
    
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { 
        error: processingError.message, 
        errorId: processingError.id,
        details: error.message 
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
      .eq('source_type', 'youtube')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}