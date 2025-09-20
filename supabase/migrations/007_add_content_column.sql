-- Add content column to documents table for full text storage
-- This migration adds a TEXT column to store complete document content

-- Add content column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;

-- Create index on content column for full-text search performance
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON documents USING gin(to_tsvector('english', content));

-- Update existing documents to populate content from metadata.textContent
-- This will migrate existing data to the new column
UPDATE documents 
SET content = metadata->>'textContent' 
WHERE content IS NULL AND metadata->>'textContent' IS NOT NULL;

-- Add comment to document the purpose of the content column
COMMENT ON COLUMN documents.content IS 'Full text content of the document for retrieval-based summarization';