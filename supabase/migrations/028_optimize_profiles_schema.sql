-- Optimize Profiles Schema Migration
-- Adds necessary columns for student and tutor onboarding while reusing existing columns

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSONB;

-- Create indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_profiles_dob ON profiles(dob);
CREATE INDEX IF NOT EXISTS idx_profiles_school ON profiles(school);
CREATE INDEX IF NOT EXISTS idx_profiles_grade_level ON profiles(grade_level);
CREATE INDEX IF NOT EXISTS idx_profiles_education ON profiles(education);
CREATE INDEX IF NOT EXISTS idx_profiles_certifications ON profiles USING GIN(certifications);
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON profiles USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_profiles_experience_years ON profiles(experience_years);
CREATE INDEX IF NOT EXISTS idx_profiles_hourly_rate ON profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_profiles_availability ON profiles USING GIN(availability);

-- Add constraints for data validation
ALTER TABLE profiles ADD CONSTRAINT check_experience_years_positive 
    CHECK (experience_years IS NULL OR experience_years >= 0);

ALTER TABLE profiles ADD CONSTRAINT check_hourly_rate_positive 
    CHECK (hourly_rate IS NULL OR hourly_rate >= 0);

-- Add comments for documentation
COMMENT ON COLUMN profiles.dob IS 'Date of birth for age verification and personalization';
COMMENT ON COLUMN profiles.school IS 'Current school or educational institution';
COMMENT ON COLUMN profiles.grade_level IS 'Current grade level or academic year';
COMMENT ON COLUMN profiles.education IS 'Highest level of education completed';
COMMENT ON COLUMN profiles.certifications IS 'Array of professional certifications';
COMMENT ON COLUMN profiles.languages IS 'Array of languages spoken';
COMMENT ON COLUMN profiles.experience_years IS 'Years of teaching/tutoring experience';
COMMENT ON COLUMN profiles.hourly_rate IS 'Hourly rate for tutoring services';
COMMENT ON COLUMN profiles.availability IS 'JSON object containing availability schedule';

-- Update the updated_at trigger to include new columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();