-- Smart Task Scheduling Enhancement Migration
-- This migration adds scheduling capabilities to the tasks table and implements
-- intelligent due date calculation functions
-- Note: due_date column already exists in the tasks table

-- Add additional scheduling columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_slot_type VARCHAR(20) DEFAULT 'flexible' 
    CHECK (time_slot_type IN ('flexible', 'fixed', 'deadline_driven'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduling_priority INTEGER DEFAULT 50;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS buffer_time INTEGER DEFAULT 0; -- minutes
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_scheduled BOOLEAN DEFAULT false;

-- Create indexes for scheduling queries (due_date index already exists)
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduling_priority ON tasks(scheduling_priority);
CREATE INDEX IF NOT EXISTS idx_tasks_auto_scheduled ON tasks(auto_scheduled);

-- Function to calculate working days between dates (excluding weekends)
CREATE OR REPLACE FUNCTION calculate_working_days(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
    total_days INTEGER;
    working_days INTEGER;
    current_date DATE;
BEGIN
    -- Handle edge cases
    IF start_date >= end_date THEN
        RETURN 0;
    END IF;
    
    total_days := EXTRACT(DAY FROM (end_date - start_date));
    working_days := 0;
    current_date := start_date::DATE;
    
    -- Count working days (Monday=1 to Friday=5)
    FOR i IN 0..total_days LOOP
        IF EXTRACT(DOW FROM current_date + i) BETWEEN 1 AND 5 THEN
            working_days := working_days + 1;
        END IF;
    END LOOP;
    
    RETURN working_days;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate intelligent due dates for tasks
CREATE OR REPLACE FUNCTION calculate_task_due_date(
    goal_deadline TIMESTAMP WITH TIME ZONE,
    task_order INTEGER,
    total_tasks INTEGER,
    estimated_duration INTEGER,
    dependencies JSONB DEFAULT '[]'::JSONB
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    days_available INTEGER;
    task_position_ratio DECIMAL;
    buffer_days INTEGER := 2;
    calculated_date TIMESTAMP WITH TIME ZONE;
    dependency_buffer INTEGER := 0;
BEGIN
    -- Handle edge cases
    IF goal_deadline <= NOW() THEN
        RETURN NOW() + INTERVAL '1 day';
    END IF;
    
    IF total_tasks <= 0 OR task_order <= 0 THEN
        RETURN goal_deadline - INTERVAL '1 day';
    END IF;
    
    -- Calculate available working days (excluding weekends)
    days_available := calculate_working_days(NOW(), goal_deadline);
    
    -- Ensure minimum working days
    IF days_available < 1 THEN
        days_available := 1;
    END IF;
    
    -- Calculate position ratio (0.0 to 1.0)
    task_position_ratio := LEAST(task_order::DECIMAL / total_tasks::DECIMAL, 1.0);
    
    -- Apply buffer for dependencies
    IF dependencies IS NOT NULL AND json_array_length(dependencies) > 0 THEN
        dependency_buffer := LEAST(json_array_length(dependencies), 3);
    END IF;
    
    -- Calculate base buffer days
    buffer_days := buffer_days + dependency_buffer;
    
    -- Calculate due date with intelligent distribution
    -- Tasks are distributed across the timeline with earlier tasks getting earlier due dates
    calculated_date := goal_deadline - INTERVAL '1 day' * buffer_days;
    calculated_date := calculated_date - INTERVAL '1 day' * 
        ((1.0 - task_position_ratio) * GREATEST(days_available - buffer_days, 1));
    
    -- Ensure it's not in the past (add at least 1 hour from now)
    IF calculated_date < NOW() + INTERVAL '1 hour' THEN
        calculated_date := NOW() + INTERVAL '1 day';
    END IF;
    
    -- Ensure it's not after the goal deadline
    IF calculated_date > goal_deadline THEN
        calculated_date := goal_deadline - INTERVAL '1 day';
    END IF;
    
    RETURN calculated_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate scheduling priority based on task characteristics
CREATE OR REPLACE FUNCTION calculate_scheduling_priority(
    task_data JSON,
    goal_record goals
)
RETURNS INTEGER AS $$
DECLARE
    base_priority INTEGER := 50;
    priority_boost INTEGER := 0;
    task_priority VARCHAR(20);
    estimated_duration INTEGER;
    dependencies_count INTEGER;
BEGIN
    -- Get task priority
    task_priority := COALESCE((task_data->>'priority')::VARCHAR(20), 'medium');
    estimated_duration := COALESCE((task_data->>'estimated_duration')::INTEGER, 60);
    
    -- Base priority from task priority level
    CASE task_priority
        WHEN 'high' THEN base_priority := 80;
        WHEN 'medium' THEN base_priority := 50;
        WHEN 'low' THEN base_priority := 20;
        ELSE base_priority := 50;
    END CASE;
    
    -- Boost for dependencies (tasks that block others get higher priority)
    IF task_data->'dependencies' IS NOT NULL THEN
        dependencies_count := json_array_length(task_data->'dependencies');
        priority_boost := priority_boost + (dependencies_count * 10);
    END IF;
    
    -- Boost for longer tasks (schedule them earlier)
    IF estimated_duration > 120 THEN -- More than 2 hours
        priority_boost := priority_boost + 15;
    ELSIF estimated_duration > 60 THEN -- More than 1 hour
        priority_boost := priority_boost + 10;
    END IF;
    
    -- Boost based on goal priority
    IF goal_record.priority = 'high' THEN
        priority_boost := priority_boost + 20;
    ELSIF goal_record.priority = 'medium' THEN
        priority_boost := priority_boost + 10;
    END IF;
    
    RETURN LEAST(base_priority + priority_boost, 100);
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to insert tasks with intelligent scheduling
CREATE OR REPLACE FUNCTION insert_scheduled_subtasks(
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
BEGIN
    -- Get goal details
    SELECT * INTO goal_record FROM goals WHERE id = p_goal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found with id: %', p_goal_id;
    END IF;
    
    -- Calculate total tasks for scheduling distribution
    total_tasks := json_array_length(p_subtasks);
    
    -- Insert each subtask with calculated due date and scheduling metadata
    FOR subtask IN SELECT * FROM json_array_elements(p_subtasks)
    LOOP
        -- Calculate intelligent due date based on task order and characteristics
        calculated_due_date := calculate_task_due_date(
            goal_record.deadline,
            COALESCE((subtask->>'order_index')::INTEGER, task_order),
            total_tasks,
            COALESCE((subtask->>'estimated_duration')::INTEGER, 60),
            COALESCE((subtask->'dependencies')::JSONB, '[]'::JSONB)
        );
        
        -- Insert task with scheduling information
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
            status,
            auto_scheduled,
            scheduling_priority,
            time_slot_type,
            buffer_time
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
            'pending',
            true, -- auto_scheduled
            calculate_scheduling_priority(subtask, goal_record),
            'deadline_driven',
            15 -- 15 minutes buffer time
        )
        RETURNING * INTO current_task;
        
        RETURN NEXT current_task;
        task_order := task_order + 1;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing insert_generated_subtasks function to use scheduling
CREATE OR REPLACE FUNCTION insert_generated_subtasks(
    p_goal_id UUID,
    p_subtasks JSON
)
RETURNS SETOF tasks AS $$
BEGIN
    -- Use the new scheduled subtasks function
    RETURN QUERY SELECT * FROM insert_scheduled_subtasks(p_goal_id, p_subtasks);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_working_days(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_task_due_date(TIMESTAMP WITH TIME ZONE, INTEGER, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_scheduling_priority(JSON, goals) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_scheduled_subtasks(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_generated_subtasks(UUID, JSON) TO authenticated;

-- Update existing tasks to have default scheduling values where null
UPDATE tasks 
SET 
    auto_scheduled = COALESCE(auto_scheduled, false),
    scheduling_priority = COALESCE(scheduling_priority, 50),
    time_slot_type = COALESCE(time_slot_type, 'flexible'),
    buffer_time = COALESCE(buffer_time, 0)
WHERE auto_scheduled IS NULL 
   OR scheduling_priority IS NULL 
   OR time_slot_type IS NULL 
   OR buffer_time IS NULL;

-- Create a function to reschedule existing tasks for a goal
CREATE OR REPLACE FUNCTION reschedule_goal_tasks(p_goal_id UUID)
RETURNS SETOF tasks AS $$
DECLARE
    goal_record goals%ROWTYPE;
    task_record tasks%ROWTYPE;
    task_count INTEGER := 0;
    total_tasks INTEGER;
BEGIN
    -- Get goal details
    SELECT * INTO goal_record FROM goals WHERE id = p_goal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found with id: %', p_goal_id;
    END IF;
    
    -- Count total tasks for this goal
    SELECT COUNT(*) INTO total_tasks FROM tasks WHERE goal_id = p_goal_id;
    
    -- Update each task with new due date
    FOR task_record IN 
        SELECT * FROM tasks 
        WHERE goal_id = p_goal_id 
        ORDER BY COALESCE(order_index, id::text::integer)
    LOOP
        task_count := task_count + 1;
        
        UPDATE tasks 
        SET 
            due_date = calculate_task_due_date(
                goal_record.deadline,
                task_count,
                total_tasks,
                COALESCE(estimated_duration, 60),
                COALESCE(dependencies, '[]'::JSONB)
            ),
            auto_scheduled = true,
            scheduling_priority = COALESCE(scheduling_priority, 50),
            time_slot_type = COALESCE(time_slot_type, 'deadline_driven')
        WHERE id = task_record.id
        RETURNING * INTO task_record;
        
        RETURN NEXT task_record;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reschedule_goal_tasks(UUID) TO authenticated;