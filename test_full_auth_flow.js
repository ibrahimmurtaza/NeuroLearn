const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testFullAuthenticationFlow() {
  try {
    console.log('🔐 Testing Full Authentication Flow for Peer Discovery...\n');

    // Step 1: Get Ibrahim's profile
    console.log('1. Getting Ibrahim\'s profile...');
    const { data: ibrahim, error: ibrahimError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();

    if (ibrahimError || !ibrahim) {
      console.error('❌ Could not find Ibrahim:', ibrahimError);
      return;
    }

    console.log('✅ Found Ibrahim:', {
      id: ibrahim.id,
      name: ibrahim.full_name,
      interests: ibrahim.interests
    });

    // Step 2: Check if Ibrahim has an auth user
    console.log('\n2. Checking if Ibrahim has an auth user...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    let ibrahimAuthUser = existingUsers.users.find(user => 
      user.id === ibrahim.id || 
      user.email?.includes('ibrahim') ||
      user.user_metadata?.full_name?.includes('Ibrahim')
    );

    // Step 3: Create auth user if needed
    if (!ibrahimAuthUser) {
      console.log('3. Creating auth user for Ibrahim...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'ibrahim.murtraza@example.com',
        password: 'testpassword123',
        user_metadata: {
          full_name: 'Ibrahim Murtraza'
        },
        email_confirm: true
      });

      if (createError) {
        console.error('❌ Error creating auth user:', createError);
        return;
      }

      ibrahimAuthUser = newUser.user;
      console.log('✅ Created auth user:', ibrahimAuthUser.id);

      // Update the profile to match the auth user ID if different
      if (ibrahim.id !== ibrahimAuthUser.id) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ id: ibrahimAuthUser.id })
          .eq('id', ibrahim.id);

        if (updateError) {
          console.error('❌ Error updating profile ID:', updateError);
        } else {
          console.log('✅ Updated profile ID to match auth user');
        }
      }
    } else {
      console.log('✅ Found existing auth user:', ibrahimAuthUser.id);
    }

    // Step 4: Sign in as Ibrahim
    console.log('\n4. Signing in as Ibrahim...');
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: ibrahimAuthUser.email || 'ibrahim.murtraza@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError);
      return;
    }

    console.log('✅ Authentication successful!');
    console.log('👤 User ID:', authData.user.id);
    console.log('🎫 Session token:', authData.session.access_token.substring(0, 20) + '...');

    // Step 5: Test the peer suggestions API with proper authentication
    console.log('\n5. Testing peer suggestions API with authentication...');
    
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
      
      if (data.suggestions && data.suggestions.length > 0) {
        console.log(`🎉 Found ${data.suggestions.length} peer suggestions!`);
        data.suggestions.forEach((peer, index) => {
          console.log(`   ${index + 1}. ${peer.full_name} (Score: ${peer.compatibility_score})`);
        });
      } else {
        console.log('⚠️  No peer suggestions returned');
      }
    } else {
      const errorData = await response.text();
      console.error('❌ API Error:', response.status, errorData);
    }

    // Step 6: Test the frontend flow by simulating what the discover page does
    console.log('\n6. Testing frontend simulation...');
    
    // Simulate getting session like the frontend does
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ No session found:', sessionError);
      return;
    }
    
    console.log('✅ Session found, making API call like frontend...');
    
    const frontendResponse = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('✅ Frontend simulation successful!');
      console.log('📊 Frontend response:', JSON.stringify(frontendData, null, 2));
    } else {
      const frontendError = await frontendResponse.text();
      console.error('❌ Frontend simulation failed:', frontendResponse.status, frontendError);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFullAuthenticationFlow();