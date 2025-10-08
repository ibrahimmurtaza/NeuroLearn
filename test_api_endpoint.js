const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiEndpoint() {
  try {
    console.log('=== Testing Peer Suggestions API ===');
    
    // First, let's get all profiles to see what data exists
    console.log('\n1. Checking all profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`\nProfile ${index + 1}:`);
      console.log(`- ID: ${profile.id}`);
      console.log(`- Name: ${profile.full_name}`);
      console.log(`- Academic Field: ${profile.academic_field}`);
      console.log(`- Interests: ${JSON.stringify(profile.interests)}`);
      console.log(`- Study Goals: ${profile.study_goals}`);
      console.log(`- All fields:`, Object.keys(profile));
    });
    
    // Test the compatibility algorithm logic directly
    console.log('\n2. Testing compatibility logic...');
    
    if (profiles.length >= 2) {
      const user1 = profiles[0];
      const user2 = profiles[1];
      
      console.log(`\nComparing ${user1.full_name} with ${user2.full_name}:`);
      
      // Check shared interests
      const interests1 = user1.interests || [];
      const interests2 = user2.interests || [];
      const sharedInterests = interests1.filter(interest => interests2.includes(interest));
      console.log(`- Shared interests: ${JSON.stringify(sharedInterests)}`);
      
      // Check academic field match
      const fieldMatch = user1.academic_field === user2.academic_field;
      console.log(`- Academic field match: ${fieldMatch} (${user1.academic_field} vs ${user2.academic_field})`);
    }
    
    // Test the actual database query that the API uses
    console.log('\n3. Testing API-style query...');
    
    if (profiles.length > 0) {
      const currentUserId = profiles[0].id;
      console.log(`Testing as user: ${profiles[0].full_name} (${currentUserId})`);
      
      // Simulate the API query
      const { data: suggestions, error: queryError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          academic_field,
          study_goals,
          interests,
          bio,
          avatar_url
        `)
        .neq('id', currentUserId)
        .limit(10);
      
      if (queryError) {
        console.error('Query error:', queryError);
      } else {
        console.log(`Found ${suggestions.length} potential peers:`);
        suggestions.forEach(peer => {
          console.log(`- ${peer.full_name}: ${peer.academic_field}, interests: ${JSON.stringify(peer.interests)}`);
        });
      }
    }
    
    // Test the actual API endpoint with a mock authenticated request
    console.log('\n4. Testing actual API endpoint...');
    
    if (profiles.length > 0) {
      const testUserId = profiles[0].id;
      
      // Create a mock session for testing
      const mockSession = {
        access_token: 'mock-token',
        user: { id: testUserId }
      };
      
      try {
        // Try to make a request to the actual API endpoint
        const response = await fetch('http://localhost:3000/api/networking/peers/suggestions', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockSession.access_token}`
          }
        });
        
        console.log(`API Response Status: ${response.status}`);
        const responseText = await response.text();
        console.log('API Response Body:', responseText);
        
        if (response.ok) {
          try {
            const jsonResponse = JSON.parse(responseText);
            console.log('Parsed JSON Response:', JSON.stringify(jsonResponse, null, 2));
          } catch (parseError) {
            console.log('Response is not valid JSON');
          }
        }
        
      } catch (fetchError) {
        console.log('Fetch error (server might not be running):', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testApiEndpoint();