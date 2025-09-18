-- Check current permissions for notebooks table
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'notebooks'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Grant permissions to anon role for basic read access
GRANT SELECT ON notebooks TO anon;

-- Grant full access to authenticated role
GRANT ALL PRIVILEGES ON notebooks TO authenticated;

-- Check permissions again after granting
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'notebooks'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;