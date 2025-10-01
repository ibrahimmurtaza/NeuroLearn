const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSimpleDueDateFunction() {
  try {
    console.log('Creating simple due date assignment function...');
    
    // Create a simple function that assigns due dates based on goal deadline and task order
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
    
    // Execute using direct SQL query
    const { error } = await supabase
      .from('_dummy_table_that_does_not_exist')
      .select('*')
      .limit(0);
    
    // Since we can't execute raw SQL directly, let's try a different approach
    // We'll create a new migration file and apply it
    console.log('Function SQL prepared. Need to apply via migration.');
    console.log('Creating new migration file...');
    
    const fs = require('fs');
    const migrationContent = `-- Fix due_date assignment for tasks
-- Migration to update insert_generated_subtasks function

${functionSQL}`;
    
    fs.writeFileSync('./supabase/migrations/026_fix_due_date_assignment.sql', migrationContent);
    console.log('Migration file created: 026_fix_due_date_assignment.sql');
    
    // Test if we can check existing tasks
    console.log('\nChecking existing tasks with null due_date...');
    const { data: nullTasks, error: nullError } = await supabase
      .from('tasks')
      .select('id, title, due_date, goal_id')
      .is('due_date', null)
      .limit(5);
    
    if (nullError) {
      console.error('Error checking tasks:', nullError);
    } else {
      console.log(`Found ${nullTasks.length} tasks with null due_date`);
      if (nullTasks.length > 0) {
        console.log('Sample tasks:', nullTasks);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createSimpleDueDateFunction();