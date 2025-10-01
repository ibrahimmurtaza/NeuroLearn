const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTaskDueDates() {
  try {
    console.log('🔍 Checking tasks and their due_date values...\n');

    // Get all tasks with their due dates
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, due_date, created_at, goal_id, status')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching tasks:', error);
      return;
    }

    console.log(`📊 Found ${tasks.length} tasks (showing latest 20):\n`);

    let tasksWithDueDate = 0;
    let tasksWithoutDueDate = 0;

    tasks.forEach((task, index) => {
      const hasDueDate = task.due_date !== null;
      if (hasDueDate) tasksWithDueDate++;
      else tasksWithoutDueDate++;

      console.log(`${index + 1}. ${task.title}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Due Date: ${task.due_date || 'NULL'}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Goal ID: ${task.goal_id || 'None'}`);
      console.log(`   Created: ${task.created_at}`);
      console.log('');
    });

    console.log(`📈 Summary:`);
    console.log(`   Tasks with due_date: ${tasksWithDueDate}`);
    console.log(`   Tasks without due_date: ${tasksWithoutDueDate}`);

    // Check if there are any goals
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, deadline, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (goalsError) {
      console.error('❌ Error fetching goals:', goalsError);
      return;
    }

    console.log(`\n🎯 Found ${goals.length} goals (showing latest 10):\n`);
    goals.forEach((goal, index) => {
      console.log(`${index + 1}. ${goal.title}`);
      console.log(`   ID: ${goal.id}`);
      console.log(`   Deadline: ${goal.deadline || 'NULL'}`);
      console.log(`   Created: ${goal.created_at}`);
      console.log('');
    });

    // Check tasks created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentTasks, error: recentError } = await supabase
      .from('tasks')
      .select('id, title, due_date, created_at, goal_id')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('❌ Error fetching recent tasks:', recentError);
      return;
    }

    console.log(`\n⏰ Tasks created in last 24 hours: ${recentTasks.length}\n`);
    recentTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   Due Date: ${task.due_date || 'NULL'}`);
      console.log(`   Goal ID: ${task.goal_id || 'None'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTaskDueDates();