-- Query to check all profiles and their interests
SELECT 
    id,
    full_name,
    interests,
    academic_field,
    study_goals,
    role,
    created_at
FROM profiles 
ORDER BY created_at DESC;