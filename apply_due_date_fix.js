const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDueDateFix() {
  try {
    console.log('Applying due_date fix to insert_generated_subtasks function...');
    
    // Create the updated function using RPC call
    const functionSQL = `
      CREATE OR REPLACE FUNCTION insert_generated_subtasks(
        p_goal_id UUID,
        p_subtasks JSON
      )
      RETURNS SETOF tasks AS $$
      DECLARE
        subtask JSON;
        goal_record goals%ROWTYPE;
        calculated_due_date TIMESTAMP WITH TIME ZONE;
        task_order INTEGER := 1;
        total_tasks INTEGER;
        current_task tasks%ROWTYPE;
        days_available INTEGER;
        task_position_ratio DECIMAL;
      BEGIN
        -- Get goal details
        SELECT * INTO goal_record FROM goals WHERE id = p_goal_id;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Goal not found with id: %', p_goal_id;
        END IF;
        
        -- Calculate total tasks for scheduling distribution
        total_tasks := json_array_length(p_subtasks);
        
        -- Calculate days available until deadline
        days_available := EXTRACT(DAY FROM (goal_record.deadline - NOW()));
        IF days_available < 1 THEN
          days_available := 1;
        END IF;
        
        -- Insert each subtask with calculated due date
        FOR subtask IN SELECT * FROM json_array_elements(p_subtasks)
        LOOP
          -- Calculate position ratio (0.0 to 1.0)
          task_position_ratio := LEAST(task_order::DECIMAL / total_tasks::DECIMAL, 1.0);
          
          -- Calculate due date: distribute tasks evenly across available time
          -- Earlier tasks get earlier due dates
          calculated_due_date := NOW() + INTERVAL '1 day' * 
            (task_position_ratio * (days_available - 1));
          
          -- Ensure it's not after the goal deadline
          IF calculated_due_date > goal_record.deadline THEN
            calculated_due_date := goal_record.deadline - INTERVAL '1 day';
          END IF;
          
          -- Ensure it's not in the past
          IF calculated_due_date < NOW() + INTERVAL '1 hour' THEN
            calculated_due_date := NOW() + INTERVAL '1 day';
          END IF;
          
          -- Insert task with calculated due date
          INSERT INTO tasks (
            user_id,
            goal_id,
            title,
            description,
            priority,
            estimated_duration,
            due_date,
            order_index,
            dependencies,
            status
          )
          VALUES (
            goal_record.user_id,
            p_goal_id,
            (subtask->>'title')::VARCHAR(255),
            COALESCE((subtask->>'description')::TEXT, ''),
            COALESCE((subtask->>'priority')::VARCHAR(20), 'medium'),
            COALESCE((subtask->>'estimated_duration')::INTEGER, 60),
            calculated_due_date,
            COALESCE((subtask->>'order_index')::INTEGER, task_order),
            COALESCE((subtask->'dependencies')::JSONB, '[]'::JSONB),
            'pending'
          )
          RETURNING * INTO current_task;
          
          RETURN NEXT current_task;
          task_order := task_order + 1;
        END LOOP;
        
        RETURN;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      GRANT EXECUTE ON FUNCTION insert_generated_subtasks(UUID, JSON) TO authenticated;
    `;
    
    // Try to execute the function creation using a direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error) {
      console.log('RPC exec_sql not available, trying alternative approach...');
      
      // Alternative: Use the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql: functionSQL })
      });
      
      if (!response.ok) {
        console.log('Direct SQL execution not available. Creating test script instead...');
        
        // Test if we can at least check the current function
        console.log('Testing current insert_generated_subtasks function...');
        
        // Check if function exists
        const { data: functionExists, error: funcError } = await supabase
          .from('information_schema.routines')
          .select('routine_name')
          .eq('routine_name', 'insert_generated_subtasks')
          .eq('routine_schema', 'public');
        
        if (funcError) {
          console.error('Error checking function existence:', funcError);
        } else {
          console.log('Function exists:', functionExists.length > 0);
        }
        
        // Let's try to create a simple test goal and see what happens
        console.log('\nTesting goal creation with tasks...');
        
        // First, let's check if we have any goals
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('id, title, deadline, user_id')
          .limit(1);
        
        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
        } else if (goals.length > 0) {
          console.log('Found existing goal:', goals[0]);
          
          // Try to call the function with a simple test
          const testSubtasks = [
            {
              title: 'Test Task 1',
              description: 'First test task',
              priority: 'medium',
              estimated_duration: 60
            },
            {
              title: 'Test Task 2', 
              description: 'Second test task',
              priority: 'high',
              estimated_duration: 90
            }
          ];
          
          console.log('Attempting to call insert_generated_subtasks...');
          const { data: taskResult, error: taskError } = await supabase
            .rpc('insert_generated_subtasks', {
              p_goal_id: goals[0].id,
              p_subtasks: testSubtasks
            });
          
          if (taskError) {
            console.error('Error calling insert_generated_subtasks:', taskError);
            console.log('This confirms the function needs to be updated.');
          } else {
            console.log('Function call successful! Created tasks:', taskResult);
            
            // Check the due_date values
            if (taskResult && taskResult.length > 0) {
              taskResult.forEach((task, index) => {
                console.log(`Task ${index + 1}: ${task.title}, due_date: ${task.due_date}`);
              });
            }
          }
        } else {
          console.log('No goals found to test with.');
        }
      }
    } else {
      console.log('Function updated successfully!');
    }
    
  } catch (error) {
    console.error('Error applying due_date fix:', error);
  }
}

applyDueDateFix();