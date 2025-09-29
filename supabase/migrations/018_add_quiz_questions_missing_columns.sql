-- Add missing columns to quiz_questions table
-- This migration adds flag_count and updated_at columns that are referenced by database functions

-- Add flag_count column to track number of times a question has been flagged
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Add updated_at column to track when the question was last modified
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before any update on quiz_questions
DROP TRIGGER IF EXISTS trigger_update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER trigger_update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_questions_updated_at();

-- Add index on flag_count for efficient querying of flagged questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_flag_count ON quiz_questions(flag_count) WHERE flag_count > 0;

-- Add index on updated_at for efficient sorting by modification time
CREATE INDEX IF NOT EXISTS idx_quiz_questions_updated_at ON quiz_questions(updated_at);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON quiz_questions TO authenticated;
GRANT SELECT ON quiz_questions TO anon;

-- Update RLS policies to include new columns (if needed)
-- The existing RLS policies should automatically cover the new columns

COMMIT;