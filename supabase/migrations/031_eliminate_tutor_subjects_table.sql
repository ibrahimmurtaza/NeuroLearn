-- Migration: Eliminate tutor_subjects table and add tutor_subjects column to profiles
-- This migration consolidates tutor subjects into the profiles table as a JSONB column

-- 1. Add tutor_subjects JSONB column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tutor_subjects JSONB DEFAULT '[]'::jsonb;

-- 2. Create index for tutor_subjects JSONB column for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_tutor_subjects ON profiles USING GIN (tutor_subjects);

-- 3. Migrate existing data from tutor_subjects table to profiles.tutor_subjects column
UPDATE profiles 
SET tutor_subjects = (
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'subject_id', ts.subject_id,
                'specializations', ts.specializations,
                'proficiency_level', ts.proficiency_level
            )
        ), 
        '[]'::jsonb
    )
    FROM tutor_subjects ts
    WHERE ts.profile_id = profiles.id
)
WHERE role = 'tutor';

-- 4. Drop all constraints, indexes, and policies related to tutor_subjects table
DROP POLICY IF EXISTS "Users can view their own tutor subjects" ON tutor_subjects;
DROP POLICY IF EXISTS "Users can manage their own tutor subjects" ON tutor_subjects;
DROP POLICY IF EXISTS "Anyone can view tutor subjects" ON tutor_subjects;
DROP POLICY IF EXISTS "Tutors can manage their own subjects" ON tutor_subjects;

-- Drop indexes
DROP INDEX IF EXISTS idx_tutor_subjects_profile_id;
DROP INDEX IF EXISTS idx_tutor_subjects_tutor_id;
DROP INDEX IF EXISTS idx_tutor_subjects_proficiency;

-- Drop constraints
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_profile_id_fkey;
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_profile_id_subject_id_key;
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_tutor_profile_id_subject_id_key;
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS fk_tutor_subjects_profile_id;

-- 5. Drop the tutor_subjects table
DROP TABLE IF EXISTS tutor_subjects;

-- 6. Update the get_tutor_profile_with_subjects function to work with the new column structure
DROP FUNCTION IF EXISTS get_tutor_profile_with_subjects(UUID);

CREATE OR REPLACE FUNCTION get_tutor_profile_with_subjects(profile_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', p.*,
        'subjects', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'subject', s.*,
                        'specializations', (ts->>'specializations')::text[],
                        'proficiency_level', ts->>'proficiency_level'
                    )
                )
                FROM jsonb_array_elements(p.tutor_subjects) AS ts
                LEFT JOIN subjects s ON s.id::text = ts->>'subject_id'
                WHERE s.id IS NOT NULL
            ),
            '[]'::jsonb
        )
    )
    INTO result
    FROM profiles p
    WHERE p.id = profile_uuid AND p.role = 'tutor';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 8. Add comment to document the new structure
COMMENT ON COLUMN profiles.tutor_subjects IS 'JSONB array storing tutor subject specializations with structure: [{"subject_id": "uuid", "specializations": ["text"], "proficiency_level": "text"}]';