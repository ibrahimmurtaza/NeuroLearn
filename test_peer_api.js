const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDU4NDcsImV4cCI6MjA3MjkyMTg0N30.1TUCM4-UjgQl2T1I4iuH1z5Lg09KPY_T-vHkowwZOQI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPeerSuggestionsAPI() {
  try {
    console.log('Testing peer suggestions API...');
    
    // First, let's get Ibrahim's user ID from auth.users
    const { data: authUsers, error: authError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();
    
    if (authError || !authUsers) {
      console.error('Could not find Ibrahim in profiles:', authError);
      return;
    }
    
    console.log('Found Ibrahim profile:', authUsers);
    
    // Now let's simulate a request to the peer suggestions API
    // We need to check if there's a way to authenticate as Ibrahim
    
    // Let's check the auth.users table to see if we can find the actual user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching auth users:', usersError);
      return;
    }
    
    console.log('Auth users found:', users.users.length);
    users.users.forEach(user => {
      console.log(`User: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
    });
    
    // Try to find Ibrahim's auth user
    const ibrahimAuthUser = users.users.find(user => 
      user.user_metadata?.full_name?.includes('Ibrahim') || 
      user.email?.includes('ibrahim')
    );
    
    if (ibrahimAuthUser) {
      console.log('Found Ibrahim auth user:', ibrahimAuthUser.id);
      
      // Now let's test the API by making a direct call
      const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ibrahimAuthUser.access_token || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
      } else {
        console.log('API Error:', response.status, await response.text());
      }
    } else {
      console.log('Could not find Ibrahim in auth users');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPeerSuggestionsAPI();