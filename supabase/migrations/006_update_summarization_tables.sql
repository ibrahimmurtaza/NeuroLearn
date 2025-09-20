-- Update Summarization Module Tables
-- This migration adds missing columns and updates constraints to match the application requirements

-- First, drop the existing CHECK constraint on summary_type
ALTER TABLE summaries DROP CONSTRAINT IF EXISTS summaries_summary_type_check;

-- Add missing columns to summaries table
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS key_points TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update summary_type to accept more values
ALTER TABLE summaries 
ALTER COLUMN summary_type TYPE VARCHAR(100);

-- Add new columns to documents table if not exists
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS content TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_summaries_document_id ON summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_summaries_processing_status ON summaries(processing_status);
CREATE INDEX IF NOT EXISTS idx_summaries_language ON summaries(language);
CREATE INDEX IF NOT EXISTS idx_summaries_tags ON summaries USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

-- Update the title column in summaries to allow NULL (for flexibility)
ALTER TABLE summaries ALTER COLUMN title DROP NOT NULL;

-- Add a function to update word count automatically
CREATE OR REPLACE FUNCTION update_word_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = array_length(string_to_array(NEW.content, ' '), 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update word count
DROP TRIGGER IF EXISTS update_summaries_word_count ON summaries;
CREATE TRIGGER update_summaries_word_count
    BEFORE INSERT OR UPDATE OF content ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_word_count();

-- Update existing summaries to have proper word count
UPDATE summaries 
SET word_count = array_length(string_to_array(content, ' '), 1)
WHERE word_count = 0 OR word_count IS NULL;

-- Grant permissions for new columns
GRANT ALL PRIVILEGES ON summaries TO authenticated;
GRANT ALL PRIVILEGES ON documents TO authenticated;

-- Add sample data for testing (optional - can be removed in production)
-- This helps with initial testing of the application
DO $$
BEGIN
    -- Only insert sample data if the tables are empty
    IF NOT EXISTS (SELECT 1 FROM summaries LIMIT 1) THEN
        -- Insert a sample document
        INSERT INTO documents (id, user_id, filename, file_type, storage_path, title, processing_status)
        VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            auth.uid(),
            'sample-document.pdf',
            'pdf',
            '/storage/sample-document.pdf',
            'Sample Document',
            'completed'
        ) ON CONFLICT (id) DO NOTHING;

        -- Insert a sample summary
        INSERT INTO summaries (
            user_id,
            title,
            content,
            summary_type,
            language,
            document_id,
            key_points,
            processing_status,
            metadata
        )
        VALUES (
            auth.uid(),
            'Sample Summary',
            'This is a sample summary content for testing purposes.',
            'brief',
            'en',
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            ARRAY['Key point 1', 'Key point 2', 'Key point 3'],
            'completed',
            '{"model_used": "test", "processing_time": 100}'::jsonb
        );
    END IF;
END $$;