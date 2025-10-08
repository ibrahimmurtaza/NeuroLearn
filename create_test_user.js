const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('🔐 Creating Test User for Peer Discovery...\n');

    // Step 1: Create a new auth user
    console.log('1. Creating auth user...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'ibrahim.test@example.com',
      password: 'testpassword123',
      user_metadata: {
        full_name: 'Ibrahim Test User'
      },
      email_confirm: true
    });

    if (createError) {
      console.error('❌ Error creating auth user:', createError);
      return;
    }

    console.log('✅ Created auth user:', newUser.user.id);

    // Step 2: Create a profile for this user
    console.log('\n2. Creating profile...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: 'Ibrahim Test User',
        academic_field: 'Computer Science',
        interests: ['Computer Science', 'AI/ML', 'Web Development', 'Programming'],
        study_goals: 'Learn advanced programming concepts and AI',
        role: 'student'
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }

    console.log('✅ Created profile:', profile.id);

    // Step 3: Verify the user can sign in
    console.log('\n3. Testing sign in...');
    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: 'ibrahim.test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.error('❌ Authentication test failed:', authError);
      return;
    }

    console.log('✅ Authentication test successful!');
    console.log('👤 User ID:', authData.user.id);

    // Step 4: Test the peer suggestions API
    console.log('\n4. Testing peer suggestions API...');
    
    const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response successful!');
      console.log('📊 Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.error('❌ API Error:', response.status, errorData);
    }

    console.log('\n🎉 Test user created successfully!');
    console.log('📧 Email: ibrahim.test@example.com');
    console.log('🔑 Password: testpassword123');
    console.log('🆔 User ID:', newUser.user.id);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();