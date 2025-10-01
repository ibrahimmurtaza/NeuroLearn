const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskSchema() {
  try {
    console.log('Checking tasks table schema...');
    
    // Check if the smart scheduling columns exist
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying tasks table:', error);
      return;
    }
    
    console.log('Sample task record structure:');
    if (data && data.length > 0) {
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('No tasks found in the table');
    }
    
    // Check if the smart scheduling functions exist
    console.log('\nChecking if smart scheduling functions exist...');
    
    const { data: functions, error: funcError } = await supabase
      .rpc('calculate_task_due_date', {
        goal_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        task_order: 1,
        total_tasks: 3,
        estimated_duration: 60,
        dependencies: []
      });
    
    if (funcError) {
      console.error('calculate_task_due_date function error:', funcError);
    } else {
      console.log('calculate_task_due_date function works:', functions);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTaskSchema();