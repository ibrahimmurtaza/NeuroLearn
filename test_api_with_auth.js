const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rnqvqjqvqjqvqjqvqjqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucXZxanF2cWpxdnFqcXZxanF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzE0NzQsImV4cCI6MjA1MDU0NzQ3NH0.Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej-Ej';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiWithAuth() {
  try {
    console.log('Testing peer suggestions API with proper authentication...');
    
    // First, find Ibrahim's profile
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
      full_name: ibrahim.full_name
    });
    
    // Try to sign in as Ibrahim (this won't work without password, but let's see what happens)
    console.log('\nTesting API endpoint with authentication...');
    
    // Get a session token (this is a mock - in real app we'd have proper auth)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No active session found. Testing without auth...');
      
      // Test the API endpoint directly
      const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response body:', data);
      
      if (response.status === 401) {
        console.log('✅ API correctly requires authentication');
        console.log('This confirms the API endpoint is working but needs proper auth');
      } else if (response.status === 200) {
        console.log('✅ API returned suggestions:', data);
      } else {
        console.log('❌ Unexpected response status');
      }
    } else {
      console.log('Found active session, testing with auth...');
      
      const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response body:', JSON.stringify(data, null, 2));
      
      if (response.status === 200 && data.suggestions) {
        console.log('✅ API returned suggestions successfully!');
        console.log('Number of suggestions:', data.suggestions.length);
        
        // Check if Ameer is in the suggestions
        const ameerSuggestion = data.suggestions.find(peer => 
          peer.full_name.includes('Ameer') || peer.full_name.includes('Hamza')
        );
        
        if (ameerSuggestion) {
          console.log('✅ Found Ameer in suggestions:', ameerSuggestion);
        } else {
          console.log('❌ Ameer not found in suggestions');
          console.log('Available suggestions:', data.suggestions.map(p => p.full_name));
        }
      } else {
        console.log('❌ API did not return expected data');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testApiWithAuth();