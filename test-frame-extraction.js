require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFrameExtraction() {
  try {
    console.log('🔍 Checking for video summaries...');
    
    // Get video summaries
    const { data: videos, error: videoError } = await supabase
      .from('video_summaries')
      .select('id, title, video_url, duration')
      .limit(5);
    
    if (videoError) {
      console.error('Error fetching videos:', videoError);
      return;
    }
    
    console.log(`Found ${videos.length} video summaries`);
    
    if (videos.length === 0) {
      console.log('No videos found to test frame extraction');
      return;
    }
    
    // Show available videos
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video.id}, Title: ${video.title}, Has URL: ${!!video.video_url}`);
    });
    
    // Test with first video that has a URL
    const testVideo = videos.find(v => v.video_url);
    if (!testVideo) {
      console.log('No videos with URLs found for testing');
      return;
    }
    
    console.log(`\n🎬 Testing frame extraction for: ${testVideo.title}`);
    
    // Check current frames in database
    const { data: existingFrames, error: framesError } = await supabase
      .from('video_frames')
      .select('*')
      .eq('video_summary_id', testVideo.id);
    
    if (framesError) {
      console.error('Error checking existing frames:', framesError);
    } else {
      console.log(`Current frames in database: ${existingFrames.length}`);
    }
    
    // Test frame extraction API
    console.log('\n🖼️ Testing frame extraction API...');
    
    const response = await fetch('http://localhost:3000/api/summarize/video/frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: testVideo.id,
        frameCount: 3
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Frame extraction successful!');
      console.log('Frames generated:', result.frames?.length || 0);
      
      // Check database again
      const { data: newFrames } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_summary_id', testVideo.id);
      
      console.log(`Frames now in database: ${newFrames?.length || 0}`);
      
    } else {
      const errorText = await response.text();
      console.log('❌ Frame extraction failed');
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFrameExtraction();