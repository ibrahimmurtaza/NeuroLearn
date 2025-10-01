-- Fix due_date assignment for tasks
-- Migration to update insert_generated_subtasks function with simple due date calculation

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