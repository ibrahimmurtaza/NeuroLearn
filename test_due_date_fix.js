const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDueDateFix() {
  try {
    console.log('Testing due_date fix for insert_generated_subtasks function...\n');
    
    // First, check if we have any existing goals
    console.log('1. Checking existing goals...');
    const { data: existingGoals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, deadline, user_id')
      .limit(3);
    
    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return;
    }
    
    console.log(`Found ${existingGoals.length} existing goals`);
    
    let testGoalId;
    let testUserId;
    
    if (existingGoals.length > 0) {
      // Use existing goal
      testGoalId = existingGoals[0].id;
      testUserId = existingGoals[0].user_id;
      console.log(`Using existing goal: ${existingGoals[0].title} (deadline: ${existingGoals[0].deadline})`);
    } else {
      // Create a test goal
      console.log('No existing goals found. Creating a test goal...');
      
      // First get a user ID
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('id')
        .limit(1);
      
      if (usersError || !users || users.length === 0) {
        console.log('No users found. Creating test with dummy user ID...');
        testUserId = '00000000-0000-0000-0000-000000000000';
      } else {
        testUserId = users[0].id;
      }
      
      const testGoal = {
        user_id: testUserId,
        title: 'Test Goal for Due Date Fix',
        description: 'Testing automatic due date assignment for tasks',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        status: 'active'
      };
      
      const { data: newGoal, error: createGoalError } = await supabase
        .from('goals')
        .insert(testGoal)
        .select()
        .single();
      
      if (createGoalError) {
        console.error('Error creating test goal:', createGoalError);
        return;
      }
      
      testGoalId = newGoal.id;
      console.log(`Created test goal: ${newGoal.title} (deadline: ${newGoal.deadline})`);
    }
    
    // 2. Test the insert_generated_subtasks function
    console.log('\n2. Testing insert_generated_subtasks function...');
    
    const testSubtasks = [
      {
        title: 'Research and Planning',
        description: 'Initial research and project planning phase',
        priority: 'high',
        estimated_duration: 120,
        order_index: 1
      },
      {
        title: 'Design and Architecture',
        description: 'Create system design and architecture',
        priority: 'high',
        estimated_duration: 180,
        order_index: 2
      },
      {
        title: 'Implementation Phase 1',
        description: 'Implement core functionality',
        priority: 'medium',
        estimated_duration: 240,
        order_index: 3
      },
      {
        title: 'Testing and QA',
        description: 'Comprehensive testing and quality assurance',
        priority: 'medium',
        estimated_duration: 120,
        order_index: 4
      },
      {
        title: 'Final Review and Deployment',
        description: 'Final review and deployment preparation',
        priority: 'low',
        estimated_duration: 90,
        order_index: 5
      }
    ];
    
    console.log(`Creating ${testSubtasks.length} test tasks...`);
    
    const { data: createdTasks, error: tasksError } = await supabase
      .rpc('insert_generated_subtasks', {
        p_goal_id: testGoalId,
        p_subtasks: testSubtasks
      });
    
    if (tasksError) {
      console.error('Error calling insert_generated_subtasks:', tasksError);
      return;
    }
    
    console.log(`Successfully created ${createdTasks.length} tasks!`);
    
    // 3. Verify the due_date assignments
    console.log('\n3. Verifying due_date assignments...');
    
    createdTasks.forEach((task, index) => {
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'NULL';
      console.log(`Task ${index + 1}: "${task.title}"`);
      console.log(`  - Due Date: ${dueDate}`);
      console.log(`  - Priority: ${task.priority}`);
      console.log(`  - Duration: ${task.estimated_duration} minutes`);
      console.log('');
    });
    
    // 4. Check if any tasks still have null due_date
    const nullDueDates = createdTasks.filter(task => !task.due_date);
    if (nullDueDates.length > 0) {
      console.log(`⚠️  WARNING: ${nullDueDates.length} tasks still have null due_date!`);
      nullDueDates.forEach(task => {
        console.log(`  - ${task.title}`);
      });
    } else {
      console.log('✅ SUCCESS: All tasks have been assigned due dates!');
    }
    
    // 5. Check the date distribution
    console.log('\n4. Analyzing due date distribution...');
    const sortedTasks = createdTasks
      .filter(task => task.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    
    if (sortedTasks.length > 0) {
      const firstDue = new Date(sortedTasks[0].due_date);
      const lastDue = new Date(sortedTasks[sortedTasks.length - 1].due_date);
      const daysDiff = Math.ceil((lastDue - firstDue) / (1000 * 60 * 60 * 24));
      
      console.log(`Tasks are distributed over ${daysDiff} days`);
      console.log(`First task due: ${firstDue.toLocaleDateString()}`);
      console.log(`Last task due: ${lastDue.toLocaleDateString()}`);
      
      // Check if tasks are properly ordered
      let properlyOrdered = true;
      for (let i = 1; i < sortedTasks.length; i++) {
        if (sortedTasks[i].order_index < sortedTasks[i-1].order_index) {
          properlyOrdered = false;
          break;
        }
      }
      
      if (properlyOrdered) {
        console.log('✅ Tasks are properly ordered by due date');
      } else {
        console.log('⚠️  Tasks may not be properly ordered');
      }
    }
    
    // 6. Summary
    console.log('\n5. Test Summary:');
    console.log(`- Goal ID: ${testGoalId}`);
    console.log(`- Tasks created: ${createdTasks.length}`);
    console.log(`- Tasks with due_date: ${createdTasks.filter(t => t.due_date).length}`);
    console.log(`- Tasks with null due_date: ${createdTasks.filter(t => !t.due_date).length}`);
    
    if (createdTasks.every(task => task.due_date)) {
      console.log('\n🎉 DUE DATE FIX SUCCESSFUL! All tasks now have proper due dates.');
    } else {
      console.log('\n❌ DUE DATE FIX INCOMPLETE. Some tasks still have null due_date.');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testDueDateFix();