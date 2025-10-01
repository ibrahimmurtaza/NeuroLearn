const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCalendarAPI() {
  try {
    console.log('🧪 Testing Calendar API endpoint...\n');

    // First, check if there are any users in auth.users
    const { data: authUsers, error: authUsersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(1);

    if (authUsersError) {
      console.log('❌ Cannot access auth.users table (expected with service key):', authUsersError.message);
      console.log('Let\'s check tasks table directly...\n');
    } else if (authUsers && authUsers.length > 0) {
      console.log(`👤 Found ${authUsers.length} users in auth.users`);
      authUsers.forEach(user => console.log(`- ${user.email} (${user.id})`));
    }

    // Check tasks table directly to see what user_ids exist
    const { data: taskUsers, error: taskUsersError } = await supabase
      .from('tasks')
      .select('user_id')
      .not('user_id', 'is', null)
      .limit(10);

    if (taskUsersError) {
      console.error('❌ Error accessing tasks table:', taskUsersError);
      return;
    }

    const uniqueUserIds = [...new Set(taskUsers.map(t => t.user_id))];
    console.log(`📊 Found ${uniqueUserIds.length} unique user IDs in tasks table:`);
    uniqueUserIds.forEach(userId => console.log(`- ${userId}`));

    if (uniqueUserIds.length === 0) {
      console.log('⚠️  No tasks found with user_id values');
      return;
    }

    // Test with the first user ID found
    const testUserId = uniqueUserIds[0];
    console.log(`\n🔍 Testing calendar API query with user: ${testUserId}\n`);

    // Test the calendar API query directly (same as the API endpoint)
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        estimated_duration,
        actual_duration,
        created_at,
        updated_at,
        goals (
          id,
          title,
          category
        )
      `)
      .eq('user_id', testUserId)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    console.log(`📊 Found ${tasks.length} tasks with due dates:\n`);

    if (tasks.length === 0) {
      console.log('⚠️  No tasks found with due dates for this user');
      
      // Check if there are tasks without due dates
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('id, title, due_date, status')
        .eq('user_id', testUserId)
        .limit(5);

      if (!allTasksError && allTasks) {
        console.log(`\n📋 All tasks for this user (${allTasks.length} total):`);
        allTasks.forEach((task, index) => {
          console.log(`${index + 1}. ${task.title}`);
          console.log(`   Due Date: ${task.due_date || 'NULL'}`);
          console.log(`   Status: ${task.status}`);
          console.log('');
        });
      }
      return;
    }

    // Format tasks for calendar display (same as API)
    const calendarEvents = tasks.map(task => ({
      id: task.id,
      title: task.title,
      start: new Date(task.due_date),
      end: task.estimated_duration 
        ? new Date(new Date(task.due_date).getTime() + task.estimated_duration * 60000)
        : new Date(new Date(task.due_date).getTime() + 60 * 60000), // Default 1 hour
      allDay: false,
      resource: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        estimatedDuration: task.estimated_duration,
        actualDuration: task.actual_duration,
        goal: task.goals ? {
          id: task.goals.id,
          title: task.goals.title,
          category: task.goals.category
        } : null
      }
    }));

    console.log('📅 Calendar Events:');
    calendarEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Start: ${event.start.toISOString()}`);
      console.log(`   End: ${event.end.toISOString()}`);
      console.log(`   Status: ${event.resource.status}`);
      console.log(`   Priority: ${event.resource.priority}`);
      console.log(`   Goal: ${event.resource.goal?.title || 'None'}`);
      console.log('');
    });

    // Test with date range (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log(`🗓️  Testing with date range: ${startOfMonth.toISOString().split('T')[0]} to ${endOfMonth.toISOString().split('T')[0]}\n`);

    const { data: rangedTasks, error: rangedError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        status,
        priority
      `)
      .eq('user_id', testUserId)
      .not('due_date', 'is', null)
      .gte('due_date', startOfMonth.toISOString().split('T')[0])
      .lte('due_date', endOfMonth.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (rangedError) {
      console.error('❌ Date range query error:', rangedError);
      return;
    }

    console.log(`📊 Tasks in current month: ${rangedTasks.length}`);
    rangedTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - ${task.due_date}`);
    });

    console.log('\n✅ Calendar API test completed successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCalendarAPI();