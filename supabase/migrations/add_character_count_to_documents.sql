-- Add character_count column to documents table
ALTER TABLE public.documents 
ADD COLUMN character_count INTEGER DEFAULT 0;

-- Update existing records to calculate character_count based on content
UPDATE public.documents 
SET character_count = COALESCE(LENGTH(content), 0) 
WHERE content IS NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN public.documents.character_count IS 'Number of characters in the document content';