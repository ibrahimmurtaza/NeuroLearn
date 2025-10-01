const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync('./apply_migration_025.sql', 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Exception in statement ${i + 1}:`, err);
        }
      }
    }
    
    console.log('Migration execution completed');
    
    // Test the functions
    console.log('\nTesting calculate_task_due_date function...');
    const { data: testResult, error: testError } = await supabase
      .rpc('calculate_task_due_date', {
        goal_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        task_order: 1,
        total_tasks: 3,
        estimated_duration: 60,
        dependencies: []
      });
    
    if (testError) {
      console.error('Function test error:', testError);
    } else {
      console.log('Function test successful:', testResult);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runMigration();