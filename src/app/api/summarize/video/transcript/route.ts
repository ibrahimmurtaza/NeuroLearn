import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  authenticateUser, 
  createUnauthorizedResponse, 
  createForbiddenResponse,
  checkVideoOwnership 
} from '@/lib/auth-utils';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
  speaker?: string;
  keywords?: string[];
}

interface TranscriptResponse {
  success: boolean;
  transcript: TranscriptSegment[];
  totalSegments: number;
  totalDuration: number;
  hasMore?: boolean;
  searchResults?: {
    query: string;
    matches: Array<{
      segment: TranscriptSegment;
      relevanceScore: number;
      context: string;
    }>;
  };
}

interface RegenerateTranscriptRequest {
  videoSummaryId: string;
  userId: string;
  options: {
    language?: string;
    model?: 'whisper-1';
    prompt?: string;
    temperature?: number;
    includeTimestamps?: boolean;
    includeSpeakerLabels?: boolean;
  };
}

interface SearchTranscriptRequest {
  videoSummaryId: string;
  userId: string;
  query: string;
  options?: {
    contextWindow?: number; // seconds before/after match
    maxResults?: number;
    minRelevanceScore?: number;
  };
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

// Extract audio from video using ffmpeg
async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(path.extname(videoPath), '.wav');
  
  try {
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
    );
    return audioPath;
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw new Error('Failed to extract audio from video');
  }
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(
  audioPath: string,
  options: RegenerateTranscriptRequest['options']
): Promise<TranscriptSegment[]> {
  try {
    const audioFile = fs.createReadStream(audioPath);
    
    const transcriptionParams: any = {
      file: audioFile,
      model: options.model || 'whisper-1',
      response_format: 'verbose_json'
    };
    
    if (options.language) {
      transcriptionParams.language = options.language;
    }
    
    if (options.prompt) {
      transcriptionParams.prompt = options.prompt;
    }
    
    if (options.temperature !== undefined) {
      transcriptionParams.temperature = options.temperature;
    }
    
    if (options.includeTimestamps) {
      transcriptionParams.timestamp_granularities = ['segment'];
    }
    
    const transcription = await openai.audio.transcriptions.create(transcriptionParams);
    
    // Convert OpenAI response to our format
    const segments: TranscriptSegment[] = [];
    
    if (transcription.segments) {
      for (let i = 0; i < transcription.segments.length; i++) {
        const segment = transcription.segments[i];
        
        segments.push({
          id: `segment_${i}_${Date.now()}`,
          startTime: segment.start,
          endTime: segment.end,
          text: segment.text.trim(),
          confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined,
          keywords: segment.tokens ? segment.tokens.filter(token => token.length > 3) : undefined
        });
      }
    } else {
      // Fallback if segments are not available
      segments.push({
        id: `segment_0_${Date.now()}`,
        startTime: 0,
        endTime: 0,
        text: transcription.text || '',
        confidence: 0.95
      });
    }
    
    return segments;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
}

// Search transcript using AI-powered semantic search
async function searchTranscript(
  segments: TranscriptSegment[],
  query: string,
  options: SearchTranscriptRequest['options'] = {}
): Promise<Array<{
  segment: TranscriptSegment;
  relevanceScore: number;
  context: string;
}>> {
  try {
    const { contextWindow = 30, maxResults = 10, minRelevanceScore = 0.3 } = options;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Create search context
    const transcriptText = segments.map(s => `[${s.startTime}s] ${s.text}`).join('\n');
    
    const searchPrompt = `
      Search the following transcript for content related to: "${query}"
      
      Transcript:
      ${transcriptText}
      
      Return the most relevant segments as JSON array with this format:
      [
        {
          "startTime": number,
          "relevanceScore": number (0-1),
          "reason": "why this segment matches"
        }
      ]
      
      Only include segments with relevance score >= ${minRelevanceScore}.
      Maximum ${maxResults} results.
    `;
    
    const result = await model.generateContent(searchPrompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const searchResults = JSON.parse(text);
      const matches: Array<{
        segment: TranscriptSegment;
        relevanceScore: number;
        context: string;
      }> = [];
      
      for (const result of searchResults) {
        const matchingSegment = segments.find(s => 
          Math.abs(s.startTime - result.startTime) < 2
        );
        
        if (matchingSegment && result.relevanceScore >= minRelevanceScore) {
          // Build context around the matching segment
          const contextSegments = segments.filter(s => 
            s.startTime >= matchingSegment.startTime - contextWindow &&
            s.endTime <= matchingSegment.endTime + contextWindow
          );
          
          const context = contextSegments.map(s => s.text).join(' ');
          
          matches.push({
            segment: matchingSegment,
            relevanceScore: result.relevanceScore,
            context
          });
        }
      }
      
      return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
    } catch (parseError) {
      console.error('Error parsing search results:', parseError);
      return [];
    }
    
  } catch (error) {
    console.error('Error searching transcript:', error);
    return [];
  }
}

// GET /api/summarize/video/transcript - Get transcript for a video
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabaseClient = createRouteHandlerClient({ cookies });
    
    const { searchParams } = new URL(request.url);
    const videoSummaryId = searchParams.get('videoSummaryId') || searchParams.get('videoId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startTime = parseFloat(searchParams.get('startTime') || '0');
    const endTime = parseFloat(searchParams.get('endTime') || '0');
    
    if (!videoSummaryId) {
      return NextResponse.json(
        { error: 'Video ID or Video summary ID is required' },
        { status: 400 }
      );
    }
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabaseClient, userId, videoSummaryId);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video');
    }
    
    // Verify video summary exists and belongs to user
    const { data: videoSummary, error: summaryError } = await supabaseClient
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
    
    // Build query for transcript segments
    let transcriptQuery = supabaseClient
      .from('video_transcripts')
      .select('*')
      .eq('video_summary_id', videoSummaryId)
      .order('start_time', { ascending: true });
    
    // Apply time range filter if specified
    if (startTime > 0) {
      transcriptQuery = transcriptQuery.gte('start_time', startTime);
    }
    if (endTime > 0) {
      transcriptQuery = transcriptQuery.lte('end_time', endTime);
    }
    
    // Apply pagination
    transcriptQuery = transcriptQuery.range(offset, offset + limit - 1);
    
    const { data: transcriptData, error: transcriptError } = await transcriptQuery;
    
    if (transcriptError) {
      console.error('Error fetching transcript:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }
    
    // Convert to our format
    const segments: TranscriptSegment[] = (transcriptData || []).map(segment => ({
      id: segment.id,
      startTime: typeof segment.start_time === 'number' && !isNaN(segment.start_time) ? segment.start_time : 0,
      endTime: typeof segment.end_time === 'number' && !isNaN(segment.end_time) ? segment.end_time : 0,
      text: segment.text || '',
      confidence: segment.confidence,
      speaker: segment.speaker,
      keywords: segment.keywords
    }));
    
    // Get total count
    const { count, error: countError } = await supabaseClient
      .from('video_transcripts')
      .select('*', { count: 'exact', head: true })
      .eq('video_summary_id', videoSummaryId);
    
    const response: TranscriptResponse = {
      success: true,
      transcript: segments,
      totalSegments: count || 0,
      totalDuration: videoSummary.duration || 0,
      hasMore: (offset + limit) < (count || 0)
    };
    
    // Perform search if query is provided
    if (query && segments.length > 0) {
      const searchOptions = {
        contextWindow: parseInt(searchParams.get('contextWindow') || '30'),
        maxResults: parseInt(searchParams.get('maxResults') || '10'),
        minRelevanceScore: parseFloat(searchParams.get('minRelevanceScore') || '0.3')
      };
      
      const searchResults = await searchTranscript(segments, query, searchOptions);
      
      response.searchResults = {
        query,
        matches: searchResults
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('GET transcript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/summarize/video/transcript - Regenerate transcript for a video
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    
    const body: RegenerateTranscriptRequest = await request.json();
    const { videoSummaryId, options } = body;
    
    if (!videoSummaryId) {
      return NextResponse.json(
        { error: 'Video summary ID is required' },
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
        { error: 'Video file not available for transcription' },
        { status: 400 }
      );
    }
    
    // Update processing status
    await supabase
      .from('video_summaries')
      .update({ processing_status: 'processing' })
      .eq('id', videoSummaryId);
    
    try {
      // Download video file temporarily
      const tempVideoPath = await downloadVideoFile(videoSummary.video_url);
      
      // Extract audio
      const audioPath = await extractAudio(tempVideoPath);
      
      // Transcribe audio
      const segments = await transcribeAudio(audioPath, options);
      
      // Delete existing transcript segments
      await supabase
        .from('video_transcripts')
        .delete()
        .eq('video_summary_id', videoSummaryId);
      
      // Insert new transcript segments
      const transcriptInserts = segments.map(segment => ({
        id: segment.id,
        video_summary_id: videoSummaryId,
        start_time: segment.startTime,
        end_time: segment.endTime,
        text: segment.text,
        confidence: segment.confidence,
        speaker: segment.speaker,
        keywords: segment.keywords
      }));
      
      await supabase
        .from('video_transcripts')
        .insert(transcriptInserts);
      
      // Update processing status
      await supabase
        .from('video_summaries')
        .update({ processing_status: 'completed' })
        .eq('id', videoSummaryId);
      
      // Clean up temporary files
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(audioPath);
      
      const response: TranscriptResponse = {
        success: true,
        transcript: segments,
        totalSegments: segments.length,
        totalDuration: videoSummary.duration || 0
      };
      
      return NextResponse.json(response);
      
    } catch (processingError) {
      // Update status to failed
      await supabase
        .from('video_summaries')
        .update({ processing_status: 'failed' })
        .eq('id', videoSummaryId);
      
      console.error('Transcript regeneration error:', processingError);
      return NextResponse.json(
        { error: 'Failed to regenerate transcript' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('POST transcript error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/summarize/video/transcript - Search transcript
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    
    const body: SearchTranscriptRequest = await request.json();
    const { videoSummaryId, query, options } = body;
    
    if (!videoSummaryId || !query) {
      return NextResponse.json(
        { error: 'Video summary ID and search query are required' },
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
      .select('duration')
      .eq('id', videoSummaryId)
      .eq('user_id', userId)
      .single();
    
    if (summaryError || !videoSummary) {
      return NextResponse.json(
        { error: 'Video summary not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get all transcript segments
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select('*')
      .eq('video_summary_id', videoSummaryId)
      .order('start_time', { ascending: true });
    
    if (transcriptError) {
      console.error('Error fetching transcript for search:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }
    
    if (!transcriptData || transcriptData.length === 0) {
      return NextResponse.json({
        success: true,
        transcript: [],
        totalSegments: 0,
        totalDuration: videoSummary.duration || 0,
        searchResults: {
          query,
          matches: []
        }
      });
    }
    
    // Convert to our format
    const segments: TranscriptSegment[] = transcriptData.map(segment => ({
      id: segment.id,
      startTime: typeof segment.start_time === 'number' && !isNaN(segment.start_time) ? segment.start_time : 0,
      endTime: typeof segment.end_time === 'number' && !isNaN(segment.end_time) ? segment.end_time : 0,
      text: segment.text || '',
      confidence: segment.confidence,
      speaker: segment.speaker,
      keywords: segment.keywords
    }));
    
    // Perform search
    const searchResults = await searchTranscript(segments, query, options);
    
    const response: TranscriptResponse = {
      success: true,
      transcript: segments,
      totalSegments: segments.length,
      totalDuration: videoSummary.duration || 0,
      searchResults: {
        query,
        matches: searchResults
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('PUT transcript search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}