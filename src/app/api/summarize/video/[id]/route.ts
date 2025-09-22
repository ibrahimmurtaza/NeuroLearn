import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  authenticateUser, 
  createUnauthorizedResponse, 
  createForbiddenResponse,
  checkVideoOwnership 
} from '@/lib/auth-utils';



interface VideoSummaryResponse {
  id: string;
  title: string;
  description?: string;
  fileName?: string;
  fileSize?: number;
  videoUrl?: string;
  duration: number;
  summary: string;
  keyPoints: string[];
  summaryOptions: {
    summaryLength: 'brief' | 'detailed' | 'comprehensive';
    focusArea: 'general' | 'technical' | 'educational' | 'business';
    includeTimestamps: boolean;
    extractFrames?: boolean;
    frameInterval?: number;
    language: string;
  };
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
  transcript?: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    confidence?: number;
  }>;
  timestamps?: Array<{
    id: string;
    timestamp: number;
    title: string;
    description?: string;
    importance: 'high' | 'medium' | 'low';
    category: string;
  }>;
  frames?: Array<{
    id: string;
    timestamp: number;
    frameUrl: string;
    description?: string;
  }>;
}

interface UpdateVideoSummaryRequest {
  title?: string;
  description?: string;
  summary?: string;
  keyPoints?: string[];
  summaryOptions?: {
    summaryLength: 'brief' | 'detailed' | 'comprehensive';
    focusArea: 'general' | 'technical' | 'educational' | 'business';
    includeTimestamps: boolean;
    extractFrames?: boolean;
    frameInterval?: number;
    language: string;
  };
}

// GET /api/summarize/video/[id] - Retrieve a specific video summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabase, userId, params.id);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video summary');
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeTranscript = searchParams.get('includeTranscript') === 'true';
    const includeTimestamps = searchParams.get('includeTimestamps') === 'true';
    const includeFrames = searchParams.get('includeFrames') === 'true';

    // Get video summary
    const { data: videoSummary, error: summaryError } = await supabase
      .from('video_summaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (summaryError || !videoSummary) {
      return NextResponse.json(
        { error: 'Video summary not found' },
        { status: 404 }
      );
    }

    const response: VideoSummaryResponse = {
      id: videoSummary.id,
      title: videoSummary.title,
      description: videoSummary.description,
      fileName: videoSummary.file_name,
      fileSize: videoSummary.file_size,
      videoUrl: videoSummary.video_url,
      duration: videoSummary.duration,
      summary: videoSummary.summary,
      keyPoints: videoSummary.key_points || [],
      summaryOptions: videoSummary.summary_options || {
        summaryLength: 'detailed',
        focusArea: 'general',
        includeTimestamps: false,
        language: 'en'
      },
      processingStatus: videoSummary.processing_status,
      createdAt: videoSummary.created_at,
      updatedAt: videoSummary.updated_at
    };

    // Include transcript if requested
    if (includeTranscript) {
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('video_transcripts')
        .select('*')
        .eq('video_summary_id', id)
        .order('start_time', { ascending: true });

      if (!transcriptError && transcriptData) {
        response.transcript = transcriptData.map(segment => ({
          id: segment.id,
          startTime: typeof segment.start_time === 'number' && !isNaN(segment.start_time) ? segment.start_time : 0,
          endTime: typeof segment.end_time === 'number' && !isNaN(segment.end_time) ? segment.end_time : 0,
          text: segment.text || '',
          confidence: segment.confidence
        }));
      }
    }

    // Include timestamps if requested
    if (includeTimestamps) {
      const { data: timestampsData, error: timestampsError } = await supabase
        .from('video_timestamps')
        .select('*')
        .eq('video_summary_id', id)
        .order('timestamp', { ascending: true });

      if (!timestampsError && timestampsData) {
        response.timestamps = timestampsData.map(ts => ({
          id: ts.id,
          timestamp: ts.timestamp,
          title: ts.title,
          description: ts.description,
          importance: ts.importance,
          category: ts.category
        }));
      }
    }

    // Include frames if requested
    if (includeFrames) {
      const { data: framesData, error: framesError } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_summary_id', id)
        .order('timestamp', { ascending: true });

      if (!framesError && framesData) {
        response.frames = framesData.map(frame => ({
          id: frame.id,
          timestamp: frame.timestamp,
          frameUrl: frame.frame_url,
          description: frame.description
        }));
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET video summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/summarize/video/[id] - Update a video summary
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabase, userId, params.id);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video summary');
    }

    const { id } = params;
    const body: UpdateVideoSummaryRequest = await request.json();
    const updateData = body;

    // Prepare update data
    const updateFields: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.title !== undefined) {
      updateFields.title = updateData.title;
    }
    if (updateData.description !== undefined) {
      updateFields.description = updateData.description;
    }
    if (updateData.summary !== undefined) {
      updateFields.summary = updateData.summary;
    }
    if (updateData.keyPoints !== undefined) {
      updateFields.key_points = updateData.keyPoints;
    }
    if (updateData.summaryOptions !== undefined) {
      updateFields.summary_options = updateData.summaryOptions;
    }

    // Update video summary
    const { data: updatedVideo, error: updateError } = await supabase
      .from('video_summaries')
      .update(updateFields)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating video summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to update video summary' },
        { status: 500 }
      );
    }

    const response: VideoSummaryResponse = {
      id: updatedVideo.id,
      title: updatedVideo.title,
      description: updatedVideo.description,
      fileName: updatedVideo.file_name,
      fileSize: updatedVideo.file_size,
      videoUrl: updatedVideo.video_url,
      duration: updatedVideo.duration,
      summary: updatedVideo.summary,
      keyPoints: updatedVideo.key_points || [],
      summaryOptions: updatedVideo.summary_options || {
        summaryLength: 'detailed',
        focusArea: 'general',
        includeTimestamps: false,
        language: 'en'
      },
      processingStatus: updatedVideo.processing_status,
      createdAt: updatedVideo.created_at,
      updatedAt: updatedVideo.updated_at
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('PUT video summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/summarize/video/[id] - Delete a video summary and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }
    
    const userId = authResult.user.id;
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check ownership
    const hasAccess = await checkVideoOwnership(supabase, userId, params.id);
    if (!hasAccess) {
      return createForbiddenResponse('You do not have access to this video summary');
    }

    const { id } = params;

    // Verify ownership and get video data
    const { data: videoSummary, error: checkError } = await supabase
      .from('video_summaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !videoSummary) {
      return NextResponse.json(
        { error: 'Video summary not found or access denied' },
        { status: 404 }
      );
    }

    try {
      // Delete related data in correct order (due to foreign key constraints)
      
      // Delete video frames from storage and database
      const { data: framesData } = await supabase
        .from('video_frames')
        .select('frame_url')
        .eq('video_summary_id', id);
      
      if (framesData && framesData.length > 0) {
        // Delete frame files from storage
        for (const frame of framesData) {
          if (frame.frame_url) {
            const framePath = frame.frame_url.split('/').pop();
            if (framePath) {
              await supabase.storage
                .from('video-frames')
                .remove([`${id}/${framePath}`]);
            }
          }
        }
        
        // Delete frame records
        await supabase
          .from('video_frames')
          .delete()
          .eq('video_summary_id', id);
      }
      
      // Delete video timestamps
      await supabase
        .from('video_timestamps')
        .delete()
        .eq('video_summary_id', id);
      
      // Delete video transcripts
      await supabase
        .from('video_transcripts')
        .delete()
        .eq('video_summary_id', id);
      
      // Delete video file from storage if it exists
      if (videoSummary.file_name) {
        await supabase.storage
          .from('videos')
          .remove([`${id}/${videoSummary.file_name}`]);
      }
      
      // Finally, delete the video summary
      const { error: deleteError } = await supabase
        .from('video_summaries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error deleting video summary:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete video summary' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Video summary and all related data deleted successfully'
      });
      
    } catch (deletionError) {
      console.error('Error during deletion process:', deletionError);
      return NextResponse.json(
        { error: 'Failed to completely delete video summary' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('DELETE video summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}