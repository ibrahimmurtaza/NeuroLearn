// Check users in database using service role key
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseUsers() {
  try {
    console.log('Checking users in auth.users table...');
    
    // Check users in auth.users
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at')
      .limit(10);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${users?.length || 0} users:`);
      users?.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    // Check audio summaries count
    console.log('Checking audio summaries...');
    const { data: summaries, error: summariesError } = await supabase
      .from('audio_summaries')
      .select('id, user_id, title, created_at')
      .limit(10);
    
    if (summariesError) {
      console.error('Error fetching summaries:', summariesError);
    } else {
      console.log(`Found ${summaries?.length || 0} audio summaries:`);
      summaries?.forEach((summary, index) => {
        console.log(`${index + 1}. Title: ${summary.title}`);
        console.log(`   User ID: ${summary.user_id}`);
        console.log(`   Created: ${summary.created_at}`);
        console.log('');
      });
    }
    
    // Check audio files count
    console.log('Checking audio files...');
    const { data: audioFiles, error: audioFilesError } = await supabase
      .from('audio_files')
      .select('id, user_id, filename, created_at')
      .limit(10);
    
    if (audioFilesError) {
      console.error('Error fetching audio files:', audioFilesError);
    } else {
      console.log(`Found ${audioFiles?.length || 0} audio files:`);
      audioFiles?.forEach((file, index) => {
        console.log(`${index + 1}. Filename: ${file.filename}`);
        console.log(`   User ID: ${file.user_id}`);
        console.log(`   Created: ${file.created_at}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabaseUsers();