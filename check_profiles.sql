-- Check for user profiles with their interests
SELECT 
    id,
    full_name,
    interests,
    academic_field,
    study_goals,
    role,
    created_at
FROM profiles 
WHERE full_name ILIKE '%Ibrahim%' OR full_name ILIKE '%Ameer%'
ORDER BY full_name;

-- Also check all profiles to see what data exists
SELECT 
    id,
    full_name,
    interests,
    academic_field,
    role
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;