-- Fix quiz_quizzes table schema to match service expectations
-- Add missing columns that createQuizRecord method expects

ALTER TABLE quiz_quizzes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'practice',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing records to have proper user_id (map creator_id to user_id)
UPDATE quiz_quizzes 
SET user_id = creator_id 
WHERE user_id IS NULL;

-- Make user_id NOT NULL after populating it
ALTER TABLE quiz_quizzes 
ALTER COLUMN user_id SET NOT NULL;

-- Add index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_quizzes_user_id ON quiz_quizzes(user_id);

-- Fix quiz_attempts table - add missing id column as PRIMARY KEY
-- First check if the table exists and doesn't have an id column
DO $$
BEGIN
    -- Check if quiz_attempts table exists and add id column if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_attempts') THEN
        -- Add id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'quiz_attempts' AND column_name = 'id') THEN
            ALTER TABLE quiz_attempts ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        END IF;
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON quiz_quizzes TO authenticated;
GRANT ALL ON quiz_attempts TO authenticated;

-- Update RLS policies if needed
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quiz_quizzes;
CREATE POLICY "Users can view their own quizzes" ON quiz_quizzes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create quizzes" ON quiz_quizzes;
CREATE POLICY "Users can create quizzes" ON quiz_quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON quiz_quizzes;
CREATE POLICY "Users can update their own quizzes" ON quiz_quizzes
    FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on quiz_quizzes if not already enabled
ALTER TABLE quiz_quizzes ENABLE ROW LEVEL SECURITY;