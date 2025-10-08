const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  try {
    console.log('Checking all profiles in the database...\n');
    
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Profile ID: ${profile.id}`);
      console.log(`   Name: ${profile.full_name || 'N/A'}`);
      console.log(`   Email: ${profile.email || 'N/A'}`);
      console.log(`   Academic Field: ${profile.academic_field || 'N/A'}`);
      console.log(`   Study Goals: ${profile.study_goals || 'N/A'}`);
      console.log(`   Interests: ${profile.interests ? JSON.stringify(profile.interests) : 'N/A'}`);
      console.log(`   Created: ${profile.created_at || 'N/A'}`);
    });
    
    // Check specifically for Ibrahim and Ameer
    console.log('\n--- Checking for specific users ---');
    
    const ibrahim = profiles.find(p => p.full_name && p.full_name.toLowerCase().includes('ibrahim'));
    const ameer = profiles.find(p => p.full_name && p.full_name.toLowerCase().includes('ameer'));
    
    if (ibrahim) {
      console.log('\n✓ Found Ibrahim:', ibrahim.full_name);
      console.log('  Interests:', ibrahim.interests);
    } else {
      console.log('\n✗ Ibrahim not found');
    }
    
    if (ameer) {
      console.log('\n✓ Found Ameer:', ameer.full_name);
      console.log('  Interests:', ameer.interests);
    } else {
      console.log('\n✗ Ameer not found');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkProfiles();