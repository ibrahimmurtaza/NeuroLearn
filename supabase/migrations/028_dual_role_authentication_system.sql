-- Dual Role Authentication System Migration
-- This migration adds support for Student and Tutor roles

-- 1. Update existing profiles table to include role
ALTER TABLE profiles 
ADD COLUMN role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'tutor'));

-- Create index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);

-- 2. Create tutor-specific profile extension
CREATE TABLE tutor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    teaching_experience TEXT,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
    hourly_rate DECIMAL(10,2),
    total_students INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tutor_profiles
CREATE INDEX idx_tutor_profiles_profile_id ON tutor_profiles(profile_id);
CREATE INDEX idx_tutor_profiles_availability ON tutor_profiles(availability_status);
CREATE INDEX idx_tutor_profiles_rating ON tutor_profiles(average_rating DESC);

-- 3. Create subjects table for tutor specializations
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial subjects
INSERT INTO subjects (name, category, description) VALUES
('Mathematics', 'STEM', 'Algebra, Calculus, Geometry, Statistics'),
('Physics', 'STEM', 'Classical Mechanics, Thermodynamics, Electromagnetism'),
('Chemistry', 'STEM', 'Organic, Inorganic, Physical Chemistry'),
('Biology', 'STEM', 'Cell Biology, Genetics, Ecology, Anatomy'),
('English Literature', 'Languages', 'Poetry, Prose, Drama, Literary Analysis'),
('Spanish', 'Languages', 'Grammar, Conversation, Literature'),
('French', 'Languages', 'Grammar, Conversation, Literature'),
('History', 'Social Sciences', 'World History, Regional Studies'),
('Psychology', 'Social Sciences', 'Cognitive, Behavioral, Developmental'),
('Computer Science', 'STEM', 'Programming, Algorithms, Data Structures');

-- 4. Create junction table for tutor-subject relationships
CREATE TABLE tutor_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    specializations TEXT[], -- specific areas within the subject
    proficiency_level VARCHAR(20) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tutor_profile_id, subject_id)
);

-- Create indexes for tutor_subjects
CREATE INDEX idx_tutor_subjects_tutor_id ON tutor_subjects(tutor_profile_id);
CREATE INDEX idx_tutor_subjects_subject_id ON tutor_subjects(subject_id);
CREATE INDEX idx_tutor_subjects_proficiency ON tutor_subjects(proficiency_level);

-- 5. Enable Row Level Security on new tables
ALTER TABLE tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_subjects ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for tutor_profiles
CREATE POLICY "Users can view tutor profiles" ON tutor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tutors can manage their own profile" ON tutor_profiles 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = tutor_profiles.profile_id 
            AND p.id = auth.uid() 
            AND p.role = 'tutor'
        )
    );

-- 7. Create RLS policies for subjects (public read access)
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);

-- 8. Create RLS policies for tutor_subjects
CREATE POLICY "Anyone can view tutor subjects" ON tutor_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tutors can manage their own subjects" ON tutor_subjects 
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM tutor_profiles tp
            JOIN profiles p ON tp.profile_id = p.id
            WHERE tp.id = tutor_subjects.tutor_profile_id
            AND p.id = auth.uid()
            AND p.role = 'tutor'
        )
    );

-- 9. Update existing profiles RLS policy to handle role-based access
DROP POLICY IF EXISTS "Users can view tutor profiles" ON profiles;
CREATE POLICY "Users can view tutor profiles" ON profiles 
    FOR SELECT TO authenticated USING (role = 'tutor' OR auth.uid() = id);

-- 10. Grant permissions to roles
GRANT SELECT ON subjects TO anon, authenticated;
GRANT ALL PRIVILEGES ON tutor_profiles TO authenticated;
GRANT ALL PRIVILEGES ON tutor_subjects TO authenticated;

-- 11. Create function to automatically create tutor profile when role is set to tutor
CREATE OR REPLACE FUNCTION create_tutor_profile_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is changed to tutor and no tutor profile exists, create one
    IF NEW.role = 'tutor' AND OLD.role != 'tutor' THEN
        INSERT INTO tutor_profiles (profile_id)
        VALUES (NEW.id)
        ON CONFLICT (profile_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic tutor profile creation
CREATE TRIGGER trigger_create_tutor_profile
    AFTER UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_tutor_profile_on_role_change();

-- 12. Create function to get tutor profile with subjects
CREATE OR REPLACE FUNCTION get_tutor_profile_with_subjects(tutor_profile_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tutor_profile', tp.*,
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
    FROM tutor_profiles tp
    JOIN profiles p ON tp.profile_id = p.id
    LEFT JOIN tutor_subjects ts ON tp.id = ts.tutor_profile_id
    LEFT JOIN subjects s ON ts.subject_id = s.id
    WHERE tp.id = tutor_profile_uuid
    GROUP BY tp.id, p.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;