const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthenticatedAPI() {
  try {
    console.log('=== Testing Authenticated API Call ===');
    
    // Get Ibrahim's profile
    const { data: ibrahim, error: ibrahimError } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();
    
    if (ibrahimError || !ibrahim) {
      console.error('Could not find Ibrahim:', ibrahimError);
      return;
    }
    
    console.log('Found Ibrahim:', {
      id: ibrahim.id,
      name: ibrahim.full_name,
      interests: ibrahim.interests
    });
    
    // Create a test user in auth.users for Ibrahim if it doesn't exist
    console.log('\n1. Checking if Ibrahim has an auth user...');
    
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }
    
    console.log(`Found ${existingUsers.users.length} auth users`);
    
    // Look for Ibrahim's auth user
    let ibrahimAuthUser = existingUsers.users.find(user => 
      user.id === ibrahim.id || 
      user.email?.includes('ibrahim') ||
      user.user_metadata?.full_name?.includes('Ibrahim')
    );
    
    if (!ibrahimAuthUser) {
      console.log('Creating auth user for Ibrahim...');
      
      // Create auth user for Ibrahim
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'ibrahim.murtraza@example.com',
        password: 'testpassword123',
        user_metadata: {
          full_name: 'Ibrahim Murtraza'
        },
        email_confirm: true
      });
      
      if (createError) {
        console.error('Error creating auth user:', createError);
        return;
      }
      
      ibrahimAuthUser = newUser.user;
      console.log('Created auth user:', ibrahimAuthUser.id);
      
      // Update the profile to match the auth user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: ibrahimAuthUser.id })
        .eq('id', ibrahim.id);
      
      if (updateError) {
        console.error('Error updating profile ID:', updateError);
      } else {
        console.log('Updated profile ID to match auth user');
      }
    } else {
      console.log('Found existing auth user:', ibrahimAuthUser.id);
    }
    
    // Now test the API with proper authentication
    console.log('\n2. Testing API with authentication...');
    
    // Create a session for Ibrahim
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: ibrahimAuthUser.email,
      options: {
        redirectTo: 'http://localhost:3000'
      }
    });
    
    if (sessionError) {
      console.error('Error generating session:', sessionError);
      return;
    }
    
    console.log('Generated auth link for testing');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${sessionData.properties?.access_token || 'test-token'}`
      }
    });
    
    console.log('API Response Status:', response.status);
    const responseText = await response.text();
    console.log('API Response Body:', responseText);
    
    if (response.ok) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('\n3. API Response Analysis:');
        console.log('- Suggestions count:', jsonResponse.suggestions?.length || 0);
        console.log('- Total:', jsonResponse.total);
        console.log('- Page:', jsonResponse.page);
        
        if (jsonResponse.suggestions && jsonResponse.suggestions.length > 0) {
          console.log('\nSuggested peers:');
          jsonResponse.suggestions.forEach((peer, index) => {
            console.log(`${index + 1}. ${peer.full_name} (Score: ${peer.compatibility_score})`);
          });
        } else {
          console.log('No peer suggestions returned');
        }
      } catch (parseError) {
        console.log('Response is not valid JSON');
      }
    } else {
      console.log('API call failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuthenticatedAPI();