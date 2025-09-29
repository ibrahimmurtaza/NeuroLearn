-- Check constraints on quiz_questions table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'quiz_questions' 
    AND n.nspname = 'public'
    AND c.contype = 'c';

-- Check column information
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_questions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;