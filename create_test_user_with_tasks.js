const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUserWithTasks() {
  try {
    console.log('🧪 Creating test user with tasks for calendar testing...\n');

    // Create a test user directly in auth.users
    let testUserId = '12345678-1234-1234-1234-123456789012';
    const testEmail = 'calendar-test@example.com';

    console.log('👤 Creating test user...');
    
    // First, check if user already exists by email
    const { data: existingUserByEmail, error: checkEmailError } = await supabase.auth.admin.listUsers();
    const userExists = existingUserByEmail?.users?.find(user => user.email === testEmail);
    
    if (userExists) {
      console.log('✅ Test user already exists:', userExists.id);
      // Use the existing user's ID
      testUserId = userExists.id;
    } else {
      // Create the user using admin API with a unique email
      const uniqueEmail = `calendar-test-${Date.now()}@example.com`;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: uniqueEmail,
        password: 'testpassword123',
        email_confirm: true,
        user_metadata: {
          full_name: 'Calendar Test User'
        }
      });

      if (createError) {
        console.error('❌ Failed to create test user:', createError);
        return;
      }

      testUserId = newUser.user.id;
      console.log('✅ Test user created successfully:', testUserId);
    }

    // Create a test goal
    console.log('🎯 Creating test goal...');
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: testUserId,
        title: 'Learn Python Programming',
        description: 'Master Python fundamentals and advanced concepts',
        deadline: '2025-10-31T23:59:59Z',
        priority: 'high',
        status: 'active',
        category: 'education'
      })
      .select()
      .single();

    if (goalError && goalError.code !== '23505') { // Ignore duplicate key error
      console.error('❌ Failed to create test goal:', goalError);
      return;
    }

    console.log('✅ Test goal created/exists');

    // Create test tasks with due dates
    console.log('📋 Creating test tasks with due dates...');
    
    const testTasks = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Calendar Test Task 1',
        description: 'First test task for calendar',
        due_date: '2025-10-01T10:00:00Z',
        status: 'pending',
        priority: 'high',
        estimated_duration: 120
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Calendar Test Task 2',
        description: 'Second test task for calendar',
        due_date: '2025-10-03T14:00:00Z',
        status: 'pending',
        priority: 'medium',
        estimated_duration: 90
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Calendar Test Task 3',
        description: 'Third test task for calendar',
        due_date: '2025-10-05T09:00:00Z',
        status: 'in_progress',
        priority: 'low',
        estimated_duration: 60
      }
    ];

    for (const task of testTasks) {
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          ...task,
          user_id: testUserId,
          goal_id: goal?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (taskError && taskError.code !== '23505') { // Ignore duplicate key error
        console.error(`❌ Failed to create task ${task.title}:`, taskError);
      } else {
        console.log(`✅ Created task: ${task.title}`);
      }
    }

    // Verify the tasks were created
    console.log('\n🔍 Verifying created tasks...');
    const { data: createdTasks, error: verifyError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        status,
        priority,
        goals (
          id,
          title
        )
      `)
      .eq('user_id', testUserId)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    if (verifyError) {
      console.error('❌ Failed to verify tasks:', verifyError);
      return;
    }

    console.log(`📊 Found ${createdTasks.length} tasks with due dates:`);
    createdTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Due: ${task.due_date}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Goal: ${task.goals?.title || 'None'}`);
      console.log('');
    });

    console.log('✅ Test user and tasks created successfully!');
    console.log(`👤 Test User ID: ${testUserId}`);
    console.log(`📧 Test Email: ${testEmail}`);
    console.log(`🔑 Test Password: testpassword123`);
    console.log('\nYou can now use these credentials to test the calendar functionality.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUserWithTasks();