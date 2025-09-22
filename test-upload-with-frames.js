const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testVideoUpload() {
  try {
    console.log('Testing YouTube video upload with frame extraction...');
    
    // Use a short test video URL
    const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - short video
    
    const uploadData = {
      url: testVideoUrl,
      userId: 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2', // Use existing user ID from database
      options: {
        summaryType: 'detailed',
        includeTimestamps: true,
        language: 'en'
      }
    };

    console.log('Making YouTube upload request...');
    
    // Use node-fetch for the request
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:3000/api/summarize/video/youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Upload successful!');
      console.log('Video ID:', result.videoSummaryId);
      
      // Wait a bit for processing
      console.log('Waiting 10 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check frames in database
      const { data: frames, error } = await supabase
        .from('video_frames')
        .select('*')
        .eq('video_summary_id', result.videoSummaryId)
        .order('timestamp');
      
      if (error) {
        console.error('Error fetching frames:', error);
      } else {
        console.log(`Found ${frames.length} frames in database:`);
        frames.forEach(frame => {
          console.log(`- Frame at ${frame.timestamp}s: ${frame.frame_path}`);
        });
      }
      
    } else {
      const error = await response.text();
      console.log('Upload failed:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVideoUpload();