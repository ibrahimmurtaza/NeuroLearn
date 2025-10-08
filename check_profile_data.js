const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileData() {
  console.log('=== Checking Profile Data ===');
  
  // Check Ibrahim's profile
  const { data: ibrahim, error: ibrahimError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2')
    .single();
  
  if (ibrahimError) {
    console.error('Error fetching Ibrahim profile:', ibrahimError);
  } else {
    console.log('Ibrahim profile:', ibrahim);
  }
  
  // Check all profiles
  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('id, full_name, interests, academic_field, role')
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.error('Error fetching all profiles:', allError);
  } else {
    console.log('\nAll profiles:');
    allProfiles.forEach(profile => {
      console.log(`- ${profile.full_name} (${profile.role}) - ${profile.academic_field} - Interests: ${profile.interests ? profile.interests.join(', ') : 'None'}`);
    });
  }
  
  // Check connections table
  const { data: connections, error: connectionsError } = await supabase
    .from('connections')
    .select('*');
  
  if (connectionsError) {
    console.error('Error fetching connections:', connectionsError);
  } else {
    console.log('\nConnections:', connections);
  }
}

checkProfileData().catch(console.error);