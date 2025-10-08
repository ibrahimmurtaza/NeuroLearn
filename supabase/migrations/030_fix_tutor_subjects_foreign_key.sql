-- Migration: Fix tutor_subjects foreign key constraint
-- This migration fixes the tutor_subjects table to reference profiles instead of the removed tutor_profiles table

-- 1. Drop the old foreign key constraint
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_tutor_profile_id_fkey;

-- 2. Rename the column from tutor_profile_id to profile_id
ALTER TABLE tutor_subjects RENAME COLUMN tutor_profile_id TO profile_id;

-- 3. Add new foreign key constraint referencing profiles table
ALTER TABLE tutor_subjects 
ADD CONSTRAINT tutor_subjects_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Update the index name to match the new column
DROP INDEX IF EXISTS idx_tutor_subjects_tutor_id;
CREATE INDEX idx_tutor_subjects_profile_id ON tutor_subjects(profile_id);

-- 5. Update RLS policies to use the new column name
DROP POLICY IF EXISTS "Users can view their own tutor subjects" ON tutor_subjects;
DROP POLICY IF EXISTS "Users can manage their own tutor subjects" ON tutor_subjects;

-- Create updated RLS policies
CREATE POLICY "Users can view their own tutor subjects" ON tutor_subjects
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can manage their own tutor subjects" ON tutor_subjects
    FOR ALL USING (profile_id = auth.uid());

-- 6. Grant necessary permissions
GRANT ALL ON tutor_subjects TO authenticated;
GRANT ALL ON tutor_subjects TO service_role;