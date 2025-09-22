const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('Checking video_summaries table...');
  const { data: summaries, error: summariesError } = await supabase
    .from('video_summaries')
    .select('id, title, source_type, created_at')
    .limit(5);
  
  if (summariesError) {
    console.error('Error fetching summaries:', summariesError);
  } else {
    console.log('Video summaries found:', summaries?.length || 0);
    if (summaries) {
      summaries.forEach(s => console.log(`- ${s.id}: ${s.title} (${s.source_type})`));
    }
  }
  
  console.log('\nChecking video_transcripts table...');
  const { data: transcripts, error: transcriptsError } = await supabase
    .from('video_transcripts')
    .select('video_summary_id, start_time, text')
    .limit(5);
  
  if (transcriptsError) {
    console.error('Error fetching transcripts:', transcriptsError);
  } else {
    console.log('Transcript segments found:', transcripts?.length || 0);
    if (transcripts) {
      transcripts.forEach(t => console.log(`- ${t.video_summary_id}: ${t.start_time}s - ${t.text?.substring(0, 50)}...`));
    }
  }
  
  console.log('\nChecking video_frames table...');
  const { data: frames, error: framesError } = await supabase
    .from('video_frames')
    .select('video_summary_id, timestamp, frame_path')
    .limit(5);
  
  if (framesError) {
    console.error('Error fetching frames:', framesError);
  } else {
    console.log('Frames found:', frames?.length || 0);
    if (frames) {
      frames.forEach(f => console.log(`- ${f.video_summary_id}: ${f.timestamp}s - ${f.frame_path}`));
    }
  }
}

checkTables().catch(console.error);