-- Add missing columns to video_summaries table
ALTER TABLE video_summaries 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS video_description TEXT,
ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS summary_content TEXT;

-- Update existing summary column to summary_content if needed
UPDATE video_summaries 
SET summary_content = summary 
WHERE summary_content IS NULL AND summary IS NOT NULL;

-- Add check constraint for source_type
ALTER TABLE video_summaries 
ADD CONSTRAINT check_source_type 
CHECK (source_type IN ('youtube', 'upload'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_video_summaries_source_type ON video_summaries(source_type);
CREATE INDEX IF NOT EXISTS idx_video_summaries_user_source ON video_summaries(user_id, source_type);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON video_summaries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_summaries TO authenticated;