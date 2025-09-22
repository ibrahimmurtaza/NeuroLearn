require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testFrontendAuth() {
  try {
    console.log('🔐 Testing frontend authentication flow...');
    
    // First, sign in as the test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authentication successful!');
    console.log('👤 User ID:', authData.user.id);
    console.log('🎫 Session token:', authData.session.access_token.substring(0, 20) + '...');
    
    // Now test frame extraction with the session
    console.log('🚀 Testing frame extraction with authenticated session...');
    
    const response = await fetch('http://localhost:3000/api/summarize/video/frames', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      },
      body: JSON.stringify({
        videoId: '550e8400-e29b-41d4-a716-446655440000',
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
    
    // Test GET frames endpoint too
    console.log('🔍 Testing GET frames endpoint...');
    
    const getResponse = await fetch(`http://localhost:3000/api/summarize/video/frames?videoId=550e8400-e29b-41d4-a716-446655440000`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Cookie': `sb-access-token=${authData.session.access_token}; sb-refresh-token=${authData.session.refresh_token}`
      }
    });
    
    console.log('📊 GET Response status:', getResponse.status);
    const getResponseData = await getResponse.text();
    console.log('📊 GET Response body:', getResponseData);
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testFrontendAuth();