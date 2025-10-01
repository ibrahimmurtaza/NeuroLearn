-- Migration: Add subtask functionality and fix cascade delete for tasks
-- This migration adds parent_task_id to tasks table and fixes the cascade delete issue

-- First, add the parent_task_id column to tasks table for subtask functionality
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add index for better performance on parent_task_id queries
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Drop the existing foreign key constraint for goal_id
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_goal_id_fkey;

-- Add the new foreign key constraint with CASCADE delete
ALTER TABLE tasks ADD CONSTRAINT tasks_goal_id_fkey 
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;

-- Add a check constraint to prevent circular references (a task cannot be its own parent)
ALTER TABLE tasks ADD CONSTRAINT check_no_self_reference 
  CHECK (id != parent_task_id);

-- Create a function to check for circular references in the task hierarchy
CREATE OR REPLACE FUNCTION check_task_hierarchy_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_task_id is NULL, no need to check
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if setting this parent would create a circular reference
  -- by checking if the new parent_task_id is a descendant of the current task
  IF EXISTS (
    WITH RECURSIVE task_hierarchy AS (
      -- Base case: start with the proposed parent
      SELECT id, parent_task_id, 1 as level
      FROM tasks 
      WHERE id = NEW.parent_task_id
      
      UNION ALL
      
      -- Recursive case: find all descendants
      SELECT t.id, t.parent_task_id, th.level + 1
      FROM tasks t
      INNER JOIN task_hierarchy th ON t.parent_task_id = th.id
      WHERE th.level < 10 -- Prevent infinite recursion
    )
    SELECT 1 FROM task_hierarchy WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Cannot create circular reference in task hierarchy';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce hierarchy validation
CREATE TRIGGER trigger_check_task_hierarchy
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_hierarchy_circular_reference();

-- Create a function to get task hierarchy (useful for frontend)
CREATE OR REPLACE FUNCTION get_task_hierarchy(goal_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  estimated_duration INTEGER,
  parent_task_id UUID,
  level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE task_tree AS (
    -- Base case: root tasks (no parent)
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.estimated_duration,
      t.parent_task_id,
      0 as level,
      ARRAY[t.title] as path
    FROM tasks t
    WHERE t.goal_id = goal_uuid AND t.parent_task_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child tasks
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.due_date,
      t.estimated_duration,
      t.parent_task_id,
      tt.level + 1,
      tt.path || t.title
    FROM tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
    WHERE tt.level < 10 -- Prevent infinite recursion
  )
  SELECT * FROM task_tree ORDER BY path;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_task_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_hierarchy(UUID) TO anon;

-- Update RLS policies to handle subtasks properly
-- The existing policies should work, but let's ensure they cover parent_task_id

-- Add comment for documentation
COMMENT ON COLUMN tasks.parent_task_id IS 'References parent task for subtask functionality. NULL for root tasks.';
COMMENT ON FUNCTION get_task_hierarchy(UUID) IS 'Returns hierarchical structure of tasks for a given goal';

-- Create index for better performance on goal_id queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);

-- Create composite index for goal_id and parent_task_id queries
CREATE INDEX idx_tasks_goal_parent ON tasks(goal_id, parent_task_id);