const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manually load environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testVideoDatabase() {
  console.log('Testing video database...');
  
  try {
    // Check existing video summaries
    const { data: videos, error } = await supabase
      .from('video_summaries')
      .select('id, title, processing_status, duration, video_url')
      .limit(5);
    
    if (error) {
      console.error('Error fetching videos:', error);
      return;
    }
    
    console.log('Found videos:', videos?.length || 0);
    
    if (videos && videos.length > 0) {
      videos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title} (${video.processing_status})`);
        console.log(`   ID: ${video.id}`);
        console.log(`   Duration: ${video.duration}s`);
        console.log(`   URL: ${video.video_url?.substring(0, 50)}...`);
      });
      
      // Test frame extraction for the first completed video
      const completedVideo = videos.find(v => v.processing_status === 'completed');
      if (completedVideo) {
        console.log(`\nTesting frame extraction for: ${completedVideo.title}`);
        await testFrameExtraction(completedVideo.id);
      } else {
        console.log('\nNo completed videos found for frame extraction test');
      }
    } else {
      console.log('No videos found in database');
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

async function testFrameExtraction(videoId) {
  try {
    console.log(`Making frame extraction request for video: ${videoId}`);
    
    const response = await fetch('http://localhost:3000/api/summarize/video/frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: videoId,
        frameCount: 3
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Frame extraction successful!');
      console.log('Frames generated:', data.frames?.length || 0);
    } else {
      console.log('Frame extraction failed');
    }
    
  } catch (error) {
    console.error('Frame extraction test failed:', error);
  }
}

testVideoDatabase();