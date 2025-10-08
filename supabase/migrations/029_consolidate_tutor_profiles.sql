-- Consolidate tutor_profiles into profiles table
-- This migration removes the separate tutor_profiles table and moves all tutor data into profiles

-- 1. Add tutor-specific columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS teaching_experience TEXT,
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT[],
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- Create indexes for tutor-specific columns
CREATE INDEX IF NOT EXISTS idx_profiles_availability ON profiles(availability_status) WHERE role = 'tutor';
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(average_rating DESC) WHERE role = 'tutor';
CREATE INDEX IF NOT EXISTS idx_profiles_hourly_rate ON profiles(hourly_rate) WHERE role = 'tutor';
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved) WHERE role = 'tutor';

-- 2. Migrate existing data from tutor_profiles to profiles
UPDATE profiles 
SET 
    teaching_experience = tp.teaching_experience,
    availability_status = tp.availability_status,
    hourly_rate = tp.hourly_rate,
    total_students = tp.total_students,
    average_rating = tp.average_rating
FROM tutor_profiles tp
WHERE profiles.id = tp.profile_id;

-- 3. Update tutor_subjects table to reference profiles directly
-- First, add new column
ALTER TABLE tutor_subjects ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Populate the new column with profile_id from tutor_profiles
UPDATE tutor_subjects 
SET profile_id = tp.profile_id
FROM tutor_profiles tp
WHERE tutor_subjects.tutor_profile_id = tp.id;

-- Add foreign key constraint
ALTER TABLE tutor_subjects 
ADD CONSTRAINT fk_tutor_subjects_profile_id 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_profile_id ON tutor_subjects(profile_id);

-- 4. Drop old constraints and columns
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_tutor_profile_id_fkey;
ALTER TABLE tutor_subjects DROP CONSTRAINT IF EXISTS tutor_subjects_tutor_profile_id_subject_id_key;

-- Add new unique constraint
ALTER TABLE tutor_subjects ADD CONSTRAINT tutor_subjects_profile_id_subject_id_key UNIQUE(profile_id, subject_id);

-- Drop the old column
ALTER TABLE tutor_subjects DROP COLUMN IF EXISTS tutor_profile_id;

-- 5. Update RLS policies for tutor_subjects
DROP POLICY IF EXISTS "Tutors can manage their own subjects" ON tutor_subjects;
CREATE POLICY "Tutors can manage their own subjects" ON tutor_subjects 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = tutor_subjects.profile_id
            AND p.id = auth.uid()
            AND p.role = 'tutor'
        )
    );

-- 6. Drop tutor_profiles table and related objects
DROP TRIGGER IF EXISTS trigger_create_tutor_profile ON profiles;
DROP FUNCTION IF EXISTS create_tutor_profile_on_role_change();
DROP FUNCTION IF EXISTS get_tutor_profile_with_subjects(UUID);

-- Drop RLS policies for tutor_profiles
DROP POLICY IF EXISTS "Users can view tutor profiles" ON tutor_profiles;
DROP POLICY IF EXISTS "Tutors can manage their own profile" ON tutor_profiles;

-- Drop the table
DROP TABLE IF EXISTS tutor_profiles;

-- 7. Create new function to get tutor profile with subjects (using profiles table)
CREATE OR REPLACE FUNCTION get_tutor_profile_with_subjects(profile_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', p.*,
        'subjects', COALESCE(
            json_agg(
                json_build_object(
                    'subject', s.*,
                    'specializations', ts.specializations,
                    'proficiency_level', ts.proficiency_level
                )
            ) FILTER (WHERE s.id IS NOT NULL), 
            '[]'::json
        )
    )
    INTO result
    FROM profiles p
    LEFT JOIN tutor_subjects ts ON p.id = ts.profile_id
    LEFT JOIN subjects s ON ts.subject_id = s.id
    WHERE p.id = profile_uuid AND p.role = 'tutor'
    GROUP BY p.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update profiles RLS policies to handle consolidated data
DROP POLICY IF EXISTS "Users can view tutor profiles" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles 
    FOR SELECT TO authenticated USING (
        -- Users can see their own profile
        auth.uid() = id 
        OR 
        -- Anyone can see tutor profiles (for browsing tutors)
        role = 'tutor'
    );

-- 9. Grant necessary permissions
GRANT ALL PRIVILEGES ON profiles TO authenticated;