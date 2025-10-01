-- AI Plan Generation Enhancement
-- Migration: 023_ai_plan_generation.sql

-- Create milestones table for tracking goal progress
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
    order_index INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for milestones
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal_id ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_order ON milestones(order_index);

-- Enable RLS for milestones
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for milestones
CREATE POLICY "Users can manage their own milestones" ON milestones
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions for milestones
GRANT SELECT ON milestones TO anon;
GRANT ALL PRIVILEGES ON milestones TO authenticated;

-- Add order_index and dependencies to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]';

-- Create index for task order
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_dependencies ON tasks USING GIN(dependencies);

-- Create trigger for milestones updated_at
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced function to generate AI-powered subtasks and milestones
CREATE OR REPLACE FUNCTION generate_subtasks(goal_id UUID, goal_title TEXT, goal_description TEXT DEFAULT NULL, goal_deadline TEXT DEFAULT NULL, goal_category TEXT DEFAULT NULL, goal_priority TEXT DEFAULT 'medium')
RETURNS JSON AS $$
DECLARE
    goal_user_id UUID;
    result JSON;
BEGIN
    -- Get the user_id for the goal
    SELECT user_id INTO goal_user_id FROM goals WHERE id = generate_subtasks.goal_id;
    
    IF goal_user_id IS NULL THEN
        RAISE EXCEPTION 'Goal not found';
    END IF;
    
    -- For now, return a structured response that the API can use
    -- The actual AI generation will be handled by the API layer
    result := json_build_object(
        'success', true,
        'goal_id', goal_id,
        'user_id', goal_user_id,
        'message', 'AI plan generation initiated',
        'requires_api_processing', true
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to insert generated subtasks with intelligent scheduling
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

-- Function to insert generated milestones
CREATE OR REPLACE FUNCTION insert_generated_milestones(
    p_goal_id UUID,
    p_milestones JSON
)
RETURNS SETOF milestones AS $$
DECLARE
    milestone JSON;
    goal_user_id UUID;
BEGIN
    -- Get the user_id for the goal
    SELECT user_id INTO goal_user_id FROM goals WHERE id = p_goal_id;
    
    IF goal_user_id IS NULL THEN
        RAISE EXCEPTION 'Goal not found';
    END IF;
    
    -- Insert each milestone
    FOR milestone IN SELECT * FROM json_array_elements(p_milestones)
    LOOP
        RETURN QUERY
        INSERT INTO milestones (
            user_id,
            goal_id,
            title,
            description,
            target_date,
            order_index,
            status
        )
        VALUES (
            goal_user_id,
            p_goal_id,
            (milestone->>'title')::VARCHAR(255),
            (milestone->>'description')::TEXT,
            (milestone->>'target_date')::DATE,
            (milestone->>'order_index')::INTEGER,
            'pending'
        )
        RETURNING *;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get goal details for AI processing
CREATE OR REPLACE FUNCTION get_goal_details(p_goal_id UUID)
RETURNS JSON AS $$
DECLARE
    goal_record goals%ROWTYPE;
    result JSON;
BEGIN
    SELECT * INTO goal_record FROM goals WHERE id = p_goal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found';
    END IF;
    
    result := json_build_object(
        'id', goal_record.id,
        'title', goal_record.title,
        'description', goal_record.description,
        'deadline', goal_record.deadline,
        'priority', goal_record.priority,
        'category', goal_record.category,
        'user_id', goal_record.user_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;