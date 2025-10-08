const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  try {
    console.log('Checking profiles in database...');
    
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, interests, academic_field, study_goals, role, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. Profile:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Name: ${profile.full_name}`);
      console.log(`   Role: ${profile.role}`);
      console.log(`   Academic Field: ${profile.academic_field}`);
      console.log(`   Study Goals: ${profile.study_goals}`);
      console.log(`   Interests: ${JSON.stringify(profile.interests)}`);
      console.log(`   Created: ${profile.created_at}`);
    });
    
    // Check specifically for Ibrahim and Ameer
    console.log('\n--- Searching for specific users ---');
    
    const ibrahim = profiles.find(p => p.full_name && p.full_name.toLowerCase().includes('ibrahim'));
    const ameer = profiles.find(p => p.full_name && p.full_name.toLowerCase().includes('ameer'));
    
    if (ibrahim) {
      console.log('\nFound Ibrahim:');
      console.log(`   Name: ${ibrahim.full_name}`);
      console.log(`   Interests: ${JSON.stringify(ibrahim.interests)}`);
      console.log(`   Academic Field: ${ibrahim.academic_field}`);
    } else {
      console.log('\nIbrahim Murtaza not found in profiles');
    }
    
    if (ameer) {
      console.log('\nFound Ameer:');
      console.log(`   Name: ${ameer.full_name}`);
      console.log(`   Interests: ${JSON.stringify(ameer.interests)}`);
      console.log(`   Academic Field: ${ameer.academic_field}`);
    } else {
      console.log('\nAmeer Hamza not found in profiles');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProfiles();