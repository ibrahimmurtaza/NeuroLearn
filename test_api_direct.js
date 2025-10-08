const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiDirect() {
  try {
    console.log('Testing API endpoint directly...\n');
    
    // First, let's find Ibrahim's profile
    const { data: ibrahim, error: ibrahimError } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();
    
    if (ibrahimError) {
      console.error('Error finding Ibrahim:', ibrahimError);
      return;
    }
    
    console.log('Found Ibrahim:', ibrahim);
    
    // Now let's test the API endpoint by making a direct HTTP request
    const apiUrl = `${supabaseUrl}/rest/v1/rpc/get_peer_suggestions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: ibrahim.id
      })
    });
    
    console.log('\nAPI Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      return;
    }
    
    const suggestions = await response.json();
    console.log('\nAPI Response Data:', JSON.stringify(suggestions, null, 2));
    
    if (suggestions && suggestions.length > 0) {
      console.log(`\n✓ Found ${suggestions.length} peer suggestions for Ibrahim`);
      suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.full_name} (Score: ${suggestion.compatibility_score})`);
      });
    } else {
      console.log('\n✗ No peer suggestions found for Ibrahim');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testApiDirect();