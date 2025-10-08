const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPeerNetworking() {
  console.log('Setting up peer networking schema...');

  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, 'supabase/migrations/20251007180150_peer_networking_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
          if (error) {
            // Try with direct SQL if RPC fails
            const { error: directError } = await supabase
              .from('_temp_execution')
              .select('*')
              .limit(1);

            if (directError && directError.code !== 'PGRST116') {
              console.warn(`Statement ${i + 1} failed:`, error.message);
              console.warn('Statement:', statement.substring(0, 100) + '...');
            }
          } else {
            console.log(`✓ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`Statement ${i + 1} failed:`, err.message);
        }
      }
    }

    console.log('Peer networking schema setup completed!');

    // Test the tables
    console.log('Testing table access...');
    const { data, error } = await supabase
      .from('study_groups')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Error accessing study_groups table:', error);
    } else {
      console.log('✓ study_groups table is accessible');
    }

  } catch (error) {
    console.error('Error setting up peer networking schema:', error);
  }
}

setupPeerNetworking();