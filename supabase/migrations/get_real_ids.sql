-- Get real document and user IDs for testing
SELECT 'Document IDs:' as type, id, title FROM quiz_documents LIMIT 3;
SELECT 'User IDs:' as type, id, email FROM auth.users LIMIT 3;