require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupTestData() {
  try {
    console.log('🔧 Setting up test data...');
    
    // Create test user
    console.log('👤 Creating test user...');
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test User'
      }
    });
    
    let userId;
    if (userError && userError.code === 'email_exists') {
      console.log('✅ Test user already exists, getting user ID...');
      // Get existing user
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const testUser = existingUser.users.find(u => u.email === 'test@example.com');
      userId = testUser?.id || '550e8400-e29b-41d4-a716-446655440000';
    } else if (userError) {
      console.error('❌ Error creating user:', userError);
      return;
    } else {
      userId = userData?.user?.id || '550e8400-e29b-41d4-a716-446655440000';
    }
    
    console.log('✅ Test user ready with ID:', userId);
    
    // Insert sample video data
    console.log('📹 Creating sample video data...');
    const { data: videoData, error: videoError } = await supabase
      .from('video_summaries')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: userId,
        title: 'Introduction to Machine Learning',
        description: 'A comprehensive overview of machine learning fundamentals and applications',
        video_url: 'https://www.youtube.com/watch?v=example123',
        duration: 1800,
        summary: 'This video provides a comprehensive introduction to machine learning, covering fundamental concepts, algorithms, and real-world applications.',
        key_points: [
          {"point": "Machine learning is a subset of artificial intelligence", "importance": "high", "timestamp": 120},
          {"point": "Supervised learning uses labeled training data", "importance": "high", "timestamp": 300}
        ],
        summary_options: {
          length: "medium",
          focus: "educational", 
          language: "en",
          include_timestamps: true,
          extract_key_points: true
        },
        processing_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (videoError) {
      console.error('❌ Error creating video data:', videoError);
      return;
    }
    
    console.log('✅ Sample video data created');
    
    // Insert sample transcript data
    console.log('📝 Creating sample transcript data...');
    const transcriptSegments = [
      {
        video_summary_id: '550e8400-e29b-41d4-a716-446655440000',
        start_time: 0.0,
        end_time: 15.5,
        text: 'Welcome to this introduction to machine learning. Today we\'ll cover the fundamental concepts.',
        confidence: 0.95,
        speaker: 'Instructor'
      },
      {
        video_summary_id: '550e8400-e29b-41d4-a716-446655440000',
        start_time: 15.5,
        end_time: 32.1,
        text: 'Machine learning is a subset of artificial intelligence that focuses on algorithms.',
        confidence: 0.92,
        speaker: 'Instructor'
      },
      {
        video_summary_id: '550e8400-e29b-41d4-a716-446655440000',
        start_time: 32.1,
        end_time: 48.7,
        text: 'There are three main types: supervised, unsupervised, and reinforcement learning.',
        confidence: 0.89,
        speaker: 'Instructor'
      }
    ];
    
    const { error: transcriptError } = await supabase
      .from('video_transcripts')
      .upsert(transcriptSegments);
    
    if (transcriptError) {
      console.error('❌ Error creating transcript data:', transcriptError);
      return;
    }
    
    console.log('✅ Sample transcript data created');
    
    // Verify data was created
    console.log('🔍 Verifying test data...');
    const { data: videos, error: checkError } = await supabase
      .from('video_summaries')
      .select('id, title, user_id, processing_status')
      .eq('user_id', userId);
    
    if (checkError) {
      console.error('❌ Error checking data:', checkError);
      return;
    }
    
    console.log('✅ Found videos:', videos);
    console.log('🎉 Test data setup complete!');
    
  } catch (error) {
    console.error('💥 Setup failed with error:', error);
  }
}

setupTestData();