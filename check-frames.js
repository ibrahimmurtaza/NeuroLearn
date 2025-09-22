const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFrames() {
  console.log('🔍 Checking video_frames table...');
  
  const { data: frames, error } = await supabase
    .from('video_frames')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Found', frames.length, 'frame records:');
  frames.forEach((frame, i) => {
    console.log(`  ${i+1}. Video: ${frame.video_summary_id}, Timestamp: ${frame.timestamp}s, URL: ${frame.frame_path}`);
  });
  
  // Also check video_summaries to see which videos exist
  console.log('\n🎥 Checking video_summaries...');
  const { data: videos, error: videoError } = await supabase
    .from('video_summaries')
    .select('id, title, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (videoError) {
    console.error('❌ Video error:', videoError);
    return;
  }
  
  console.log('📊 Found', videos.length, 'video records:');
  videos.forEach((video, i) => {
    console.log(`  ${i+1}. ID: ${video.id}, Title: ${video.title}, User: ${video.user_id}`);
  });
}

checkFrames().catch(console.error);