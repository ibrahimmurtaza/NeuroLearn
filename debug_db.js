const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('=== Checking Documents Table ===');
  
  // Count documents
  const { count: docCount, error: docCountError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  
  if (docCountError) {
    console.error('Error counting documents:', docCountError);
  } else {
    console.log(`Total documents: ${docCount}`);
  }
  
  // Get recent documents with user_id
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('id, filename, processing_status, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (docError) {
    console.error('Error fetching documents:', docError);
  } else {
    console.log('Recent documents:');
    documents.forEach(doc => {
      console.log(`- ${doc.filename} (${doc.processing_status}) - User: ${doc.user_id || 'NULL'} - ${doc.created_at}`);
    });
  }
  
  console.log('\n=== Checking Summaries Table ===');
  
  // Count summaries
  const { count: summaryCount, error: summaryCountError } = await supabase
    .from('summaries')
    .select('*', { count: 'exact', head: true });
  
  if (summaryCountError) {
    console.error('Error counting summaries:', summaryCountError);
  } else {
    console.log(`Total summaries: ${summaryCount}`);
  }
  
  // Get recent summaries with user_id
  const { data: summaries, error: summaryError } = await supabase
    .from('summaries')
    .select('id, title, summary_type, user_id, created_at, content')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (summaryError) {
    console.error('Error fetching summaries:', summaryError);
  } else {
    console.log('Recent summaries:');
    summaries.forEach(summary => {
      console.log(`- ${summary.title} (${summary.summary_type}) - User: ${summary.user_id || 'NULL'} - ${summary.created_at}`);
      console.log(`  Content preview: ${summary.content ? summary.content.substring(0, 100) + '...' : 'No content'}`);
    });
  }
  
  console.log('\n=== Checking Auth Users ===');
  
  // Check if there are any users in auth.users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`Total users: ${users.users.length}`);
    users.users.forEach(user => {
      console.log(`- User: ${user.id} - Email: ${user.email || 'No email'} - Created: ${user.created_at}`);
    });
  }
}

checkDatabase().catch(console.error);