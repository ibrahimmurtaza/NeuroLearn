// Check current authentication state
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDU4NDcsImV4cCI6MjA3MjkyMTg0N30.1TUCM4-UjgQl2T1I4iuH1z5Lg09KPY_T-vHkowwZOQI';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthState() {
  try {
    console.log('Checking authentication state...');
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (session) {
      console.log('User is authenticated:');
      console.log('User ID:', session.user.id);
      console.log('Email:', session.user.email);
      console.log('Session expires at:', new Date(session.expires_at * 1000));
    } else {
      console.log('No active session found');
      console.log('User is not authenticated');
    }
    
    // Check users in database
    console.log('\nChecking users in database...');
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .limit(5);
    
    if (usersError) {
      console.log('Cannot access auth.users table (expected for anon key)');
    } else {
      console.log('Users found:', users?.length || 0);
      users?.forEach(user => {
        console.log(`- ${user.email} (${user.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking auth state:', error.message);
  }
}

checkAuthState();