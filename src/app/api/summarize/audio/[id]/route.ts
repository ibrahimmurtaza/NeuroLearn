import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Audio summary ID is required' },
        { status: 400 }
      );
    }

    // First, get the audio summary to find the related audio file
    const { data: audioSummary, error: fetchError } = await supabase
      .from('audio_summaries')
      .select('audio_file_id')
      .eq('id', id)
      .single();

    if (fetchError || !audioSummary) {
      return NextResponse.json(
        { error: 'Audio summary not found' },
        { status: 404 }
      );
    }

    // Delete the audio summary (this will cascade to related records due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('audio_summaries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting audio summary:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete audio summary' },
        { status: 500 }
      );
    }

    // Also delete the related audio file and transcript
    // Note: This assumes cascade delete is set up in the database
    // If not, we would need to delete them manually
    const { error: fileDeleteError } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', audioSummary.audio_file_id);

    if (fileDeleteError) {
      console.error('Error deleting audio file:', fileDeleteError);
      // Don't return error here as the summary is already deleted
    }

    return NextResponse.json(
      { message: 'Audio summary deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in audio delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Audio summary ID is required' },
        { status: 400 }
      );
    }

    // Fetch specific audio summary with related data
    const { data: audioSummary, error } = await supabase
      .from('audio_summaries')
      .select(`
        id,
        title,
        summary_text,
        key_points,
        created_at,
        updated_at,
        audio_files!inner (
          id,
          filename,
          file_size,
          file_type,
          duration_seconds,
          user_id
        ),
        audio_transcripts (
          id,
          transcript_text
        )
      `)
      .eq('id', id)
      .single();

    if (error || !audioSummary) {
      return NextResponse.json(
        { error: 'Audio summary not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const audioFile = Array.isArray(audioSummary.audio_files) ? audioSummary.audio_files[0] : audioSummary.audio_files;
    const transformedAudio = {
      id: audioSummary.id,
      title: audioSummary.title,
      summary: audioSummary.summary_text,
      key_points: audioSummary.key_points,
      duration: audioFile?.duration_seconds,
      file_size: audioFile?.file_size,
      file_type: audioFile?.file_type,
      created_at: audioSummary.created_at,
      updated_at: audioSummary.updated_at,
      user_id: audioFile?.user_id,
      transcript: audioSummary.audio_transcripts?.[0]?.transcript_text || ''
    };

    return NextResponse.json({
      audio: transformedAudio
    });

  } catch (error) {
    console.error('Error in audio get API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}