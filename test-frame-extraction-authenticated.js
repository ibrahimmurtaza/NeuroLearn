require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testFrameExtractionWithAuth() {
  try {
    console.log('🔍 Testing frame extraction with authentication...');
    
    // First, get video summaries to test with
    const { data: videoSummaries, error: fetchError } = await supabase
      .from('video_summaries')
      .select('id, title, video_url, user_id')
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error fetching video summaries:', fetchError);
      return;
    }
    
    if (!videoSummaries || videoSummaries.length === 0) {
      console.log('⚠️ No video summaries found in database');
      return;
    }
    
    const videoSummary = videoSummaries[0];
    console.log('📹 Found video summary:', {
      id: videoSummary.id,
      title: videoSummary.title,
      user_id: videoSummary.user_id
    });
    
    // Test the frame extraction API endpoint directly
    console.log('🚀 Testing frame extraction API...');
    
    const response = await fetch('http://localhost:3000/api/summarize/video/frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: videoSummary.id,
        frameCount: 3
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.text();
    console.log('📊 Response body:', responseData);
    
    if (!response.ok) {
      console.error('❌ Frame extraction failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseData);
        console.error('❌ Error details:', errorData);
      } catch (e) {
        console.error('❌ Raw error response:', responseData);
      }
    } else {
      console.log('✅ Frame extraction successful!');
      try {
        const successData = JSON.parse(responseData);
        console.log('✅ Success details:', successData);
      } catch (e) {
        console.log('✅ Raw success response:', responseData);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testFrameExtractionWithAuth();