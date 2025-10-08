-- User Profiles System Migration
-- Creates profiles table with RLS policies and interest categories

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    academic_field TEXT,
    study_goals TEXT,
    interests TEXT[], -- store multiple interests directly
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_academic_field ON profiles(academic_field);
CREATE INDEX idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON profiles TO anon;
GRANT ALL PRIVILEGES ON profiles TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create interest categories for better UX
CREATE TABLE interest_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    interests TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined categories
INSERT INTO interest_categories (name, description, interests) VALUES
('STEM', 'Science, Technology, Engineering, Mathematics', 
 ARRAY['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Engineering', 'Statistics', 'Calculus', 'Algebra', 'Geometry', 'Astronomy', 'Environmental Science', 'Geology', 'Meteorology', 'Biochemistry', 'Microbiology', 'Genetics', 'Botany', 'Zoology', 'Marine Biology', 'Biomedical Engineering', 'Chemical Engineering', 'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering']),
('Languages', 'Language learning and linguistics',
 ARRAY['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Linguistics', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Korean', 'Hindi', 'Dutch', 'Swedish', 'Norwegian', 'Greek', 'Latin', 'Hebrew', 'Turkish', 'Polish', 'Czech', 'Hungarian', 'Finnish', 'Thai', 'Vietnamese', 'Sign Language']),
('Business', 'Business and entrepreneurship',
 ARRAY['Marketing', 'Finance', 'Management', 'Entrepreneurship', 'Economics', 'Strategy', 'Accounting', 'Business Analytics', 'Operations Management', 'Human Resources', 'International Business', 'Supply Chain Management', 'Project Management', 'Leadership', 'Negotiation', 'Sales', 'Digital Marketing', 'Brand Management', 'Investment Banking', 'Corporate Finance', 'Business Law', 'Organizational Behavior', 'Quality Management', 'Risk Management']),
('Arts', 'Creative and artistic fields',
 ARRAY['Music', 'Visual Arts', 'Literature', 'Theater', 'Film', 'Design', 'Photography', 'Painting', 'Drawing', 'Sculpture', 'Ceramics', 'Printmaking', 'Digital Art', 'Animation', 'Graphic Design', 'Interior Design', 'Fashion Design', 'Architecture', 'Creative Writing', 'Poetry', 'Screenwriting', 'Music Theory', 'Music Composition', 'Dance', 'Ballet', 'Contemporary Dance', 'Art History']),
('Technology', 'Modern technology and digital skills',
 ARRAY['Programming', 'Web Development', 'Mobile Development', 'AI/ML', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'DevOps', 'Software Engineering', 'Database Management', 'Network Administration', 'Game Development', 'Blockchain', 'IoT', 'Robotics', 'Virtual Reality', 'Augmented Reality', 'UI/UX Design', 'System Administration', 'Information Technology', 'Computer Graphics', 'Machine Learning', 'Deep Learning', 'Natural Language Processing']),
('Health & Medicine', 'Health sciences and medical fields',
 ARRAY['Medicine', 'Nursing', 'Psychology', 'Nutrition', 'Public Health', 'Pharmacy', 'Dentistry', 'Veterinary Medicine', 'Physical Therapy', 'Occupational Therapy', 'Mental Health', 'Clinical Psychology', 'Counseling', 'Social Work', 'Epidemiology', 'Health Administration', 'Medical Research', 'Biomedical Engineering', 'Sports Medicine', 'Alternative Medicine', 'Radiology', 'Pathology', 'Pediatrics', 'Geriatrics', 'Emergency Medicine']),
('Social Sciences', 'Human behavior and society',
 ARRAY['Sociology', 'Anthropology', 'Political Science', 'History', 'Geography', 'Philosophy', 'International Relations', 'Public Policy', 'Criminology', 'Urban Planning', 'Cultural Studies', 'Gender Studies', 'Religious Studies', 'Ethics', 'Logic', 'World History', 'Ancient History', 'Modern History', 'American History', 'European History', 'Asian Studies', 'African Studies', 'Latin American Studies', 'Archaeology', 'Social Psychology']),
('Education', 'Teaching and educational sciences',
 ARRAY['Elementary Education', 'Secondary Education', 'Special Education', 'Educational Psychology', 'Curriculum Development', 'Educational Technology', 'Adult Education', 'Early Childhood Education', 'Higher Education', 'Educational Leadership', 'Instructional Design', 'Language Teaching', 'Mathematics Education', 'Science Education', 'Physical Education', 'Music Education', 'Art Education', 'Online Learning', 'Distance Education', 'Educational Assessment', 'Literacy Education', 'STEM Education', 'Inclusive Education', 'Teacher Training']),
('Law & Legal Studies', 'Legal and judicial fields',
 ARRAY['Constitutional Law', 'Criminal Law', 'Civil Law', 'Corporate Law', 'International Law', 'Environmental Law', 'Family Law', 'Immigration Law', 'Intellectual Property Law', 'Tax Law', 'Labor Law', 'Human Rights Law', 'Legal Research', 'Legal Writing', 'Paralegal Studies', 'Court Administration', 'Legal Ethics', 'Contract Law', 'Property Law', 'Administrative Law', 'Maritime Law', 'Aviation Law', 'Medical Law', 'Sports Law', 'Entertainment Law']),
('Communication & Media', 'Communication and media studies',
 ARRAY['Journalism', 'Mass Communication', 'Public Relations', 'Broadcasting', 'Digital Media', 'Social Media', 'Advertising', 'Media Studies', 'Communication Theory', 'Technical Writing', 'Content Creation', 'Podcasting', 'Video Production', 'Radio Production', 'Documentary Making', 'News Writing', 'Editorial Writing', 'Copywriting', 'Media Ethics', 'Crisis Communication', 'Corporate Communication', 'Visual Communication', 'Intercultural Communication', 'Strategic Communication']),
('Sports & Recreation', 'Physical activities and sports science',
 ARRAY['Sports Science', 'Kinesiology', 'Exercise Physiology', 'Sports Psychology', 'Athletic Training', 'Coaching', 'Recreation Management', 'Fitness Training', 'Yoga', 'Martial Arts', 'Swimming', 'Running', 'Cycling', 'Team Sports', 'Individual Sports', 'Outdoor Recreation', 'Adventure Sports', 'Sports Nutrition', 'Sports Medicine', 'Physical Fitness', 'Strength Training', 'Cardiovascular Training', 'Flexibility Training', 'Sports Rehabilitation', 'Sports Management']),
('Agriculture & Environment', 'Agricultural and environmental sciences',
 ARRAY['Agriculture', 'Horticulture', 'Animal Science', 'Crop Science', 'Soil Science', 'Agricultural Economics', 'Sustainable Agriculture', 'Environmental Science', 'Conservation Biology', 'Ecology', 'Climate Science', 'Renewable Energy', 'Environmental Policy', 'Wildlife Management', 'Forestry', 'Aquaculture', 'Food Science', 'Agricultural Technology', 'Organic Farming', 'Permaculture', 'Water Management', 'Pest Management', 'Plant Breeding', 'Agricultural Engineering', 'Environmental Chemistry']),
('Personal Development', 'Self-improvement and life skills',
 ARRAY['Time Management', 'Study Skills', 'Critical Thinking', 'Problem Solving', 'Communication Skills', 'Public Speaking', 'Leadership Development', 'Emotional Intelligence', 'Stress Management', 'Goal Setting', 'Productivity', 'Mindfulness', 'Meditation', 'Personal Finance', 'Career Development', 'Networking', 'Interview Skills', 'Conflict Resolution', 'Decision Making', 'Self-Confidence', 'Creativity', 'Innovation', 'Adaptability', 'Resilience', 'Work-Life Balance']);

-- Enable RLS and grant permissions for interest categories
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view interest categories" ON interest_categories FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON interest_categories TO anon, authenticated;

-- Insert sample profile data for testing (optional)
-- This will only work if there's a user with this ID in auth.users
-- INSERT INTO profiles (id, full_name, bio, academic_field, study_goals, avatar_url, interests)
-- VALUES (
--     'sample-user-id',
--     'Jane Doe',
--     'Passionate about learning and exploring new technologies',
--     'Computer Science',
--     'Master machine learning and AI concepts',
--     'https://example.com/avatar.jpg',
--     ARRAY['Machine Learning', 'Artificial Intelligence', 'Data Science', 'Programming']
-- ) ON CONFLICT (id) DO NOTHING;