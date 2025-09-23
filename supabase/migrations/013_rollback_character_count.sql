-- Rollback migration: Remove character_count column from documents table
-- This undoes the changes made in add_character_count_to_documents.sql

-- Remove the character_count column from the documents table
ALTER TABLE public.documents DROP COLUMN IF EXISTS character_count;

-- Add comment to track the rollback
COMMENT ON TABLE public.documents IS 'Documents table - character_count column removed via rollback migration';