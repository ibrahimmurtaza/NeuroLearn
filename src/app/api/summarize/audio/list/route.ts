import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch audio summaries with related audio file and transcript data
    // Include records with null user_id for backward compatibility
    const { data: audioSummaries, error } = await supabase
      .from('audio_summaries')
      .select(`
        id,
        title,
        summary_text,
        key_points,
        created_at,
        updated_at,
        user_id,
        audio_files!inner (
          id,
          filename,
          file_size,
          file_type,
          duration_seconds,
          user_id
        )
      `)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audio summaries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch audio summaries' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedAudios = audioSummaries?.map(summary => {
      const audioFile = Array.isArray(summary.audio_files) ? summary.audio_files[0] : summary.audio_files;
      return {
        id: summary.id,
        title: summary.title,
        summary: summary.summary_text,
        key_points: summary.key_points,
        duration: audioFile?.duration_seconds,
        file_size: audioFile?.file_size,
        file_type: audioFile?.file_type,
        created_at: summary.created_at,
        updated_at: summary.updated_at,
        user_id: audioFile?.user_id
      };
    }) || [];

    return NextResponse.json({
      audios: transformedAudios,
      count: transformedAudios.length
    });

  } catch (error) {
    console.error('Error in audio list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}