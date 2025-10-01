const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthenticatedCalendar() {
  try {
    console.log('🧪 Testing Authenticated Calendar API...\n');

    // Try to sign in with existing test user
    console.log('🔐 Attempting to sign in with test credentials...');
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'calendar-test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.log('❌ Test authentication failed:', authError.message);
      console.log('Let\'s try with the existing test user from the database...\n');

      // Get the existing test user from our previous script
      const testUserId = '57d9a316-4006-445f-ab2a-3a7a02b2fac4';
      
      // Try to get user by ID and create a session
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(testUserId);
      
      if (userError || !userData.user) {
        console.error('❌ Failed to get test user:', userError);
        return;
      }

      console.log('✅ Found test user:', userData.user.email);
      
      // Try to sign in with the user's email
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: 'testpassword123'
      });

      if (signInError) {
        console.error('❌ Test user authentication failed:', signInError.message);
        console.log('📝 Note: The user exists but password authentication may not work with admin-created users');
        console.log('🔄 Let\'s try using the service key to query directly...\n');
        
        // Use service key to query tasks directly
        await testWithServiceKey(testUserId);
        return;
      }

      authData = signInData;
    }

    console.log('✅ Authentication successful!');
    console.log('👤 User ID:', authData.user.id);

    const session = authData.session;

    // Now test the calendar API with authentication
    console.log('\n📅 Testing calendar API with authentication...');
    
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      include_completed: 'true'
    });

    // Make authenticated request to the calendar API
    const response = await fetch(`http://localhost:3001/api/schedule/calendar/tasks?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
      }
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API call failed: ${response.status} ${response.statusText}`);
      console.error(`❌ Error response:`, errorText);
      return;
    }

    const data = await response.json();
    console.log(`✅ API call successful!`);
    console.log(`📊 Events found: ${data.events?.length || 0}`);

    if (data.events && data.events.length > 0) {
      console.log(`\n📅 Calendar Events:`);
      data.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   Start: ${event.start}`);
        console.log(`   Status: ${event.resource?.status}`);
        console.log(`   Priority: ${event.resource?.priority}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No events returned from API');
      
      // Check if this user has any tasks at all
      console.log('🔍 Checking if user has any tasks...');
      const { data: userTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, due_date, status')
        .eq('user_id', userData.user.id)
        .limit(5);

      if (tasksError) {
        console.error('❌ Error checking user tasks:', tasksError);
      } else {
        console.log(`📋 User has ${userTasks.length} total tasks`);
        if (userTasks.length > 0) {
          userTasks.forEach((task, index) => {
            console.log(`${index + 1}. ${task.title} - Due: ${task.due_date || 'No due date'}`);
          });
        }
      }
    }

    console.log('\n✅ Authenticated calendar test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function testWithServiceKey(userId) {
  try {
    console.log('🔧 Testing calendar API with service key...');
    
    // Create a service key client
    const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Query tasks directly
    const { data: tasks, error: tasksError } = await serviceSupabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        status,
        priority,
        estimated_duration,
        goals (
          id,
          title,
          category
        )
      `)
      .eq('user_id', userId)
      .not('due_date', 'is', null)
      .gte('due_date', '2025-10-01T00:00:00Z')
      .lte('due_date', '2025-10-31T23:59:59Z')
      .order('due_date', { ascending: true });

    if (tasksError) {
      console.error('❌ Failed to query tasks:', tasksError);
      return;
    }

    console.log(`✅ Found ${tasks.length} tasks for October 2025:`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Due: ${task.due_date}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Goal: ${task.goals?.title || 'No goal'}`);
      console.log('');
    });

    // Test the actual API endpoint
    console.log('🌐 Testing the actual calendar API endpoint...');
    const response = await fetch(`http://localhost:3001/api/schedule/calendar/tasks?start_date=2025-10-01&end_date=2025-10-31&include_completed=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const apiData = await response.json();
    console.log('✅ API Response:', JSON.stringify(apiData, null, 2));

  } catch (error) {
    console.error('❌ Service key test failed:', error);
  }
}

testAuthenticatedCalendar();