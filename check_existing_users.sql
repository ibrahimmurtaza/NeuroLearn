-- Check what users actually exist in auth.users table
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Also check if there are any documents with chunks available
SELECT 
    d.id,
    d.title,
    d.uploader_id,
    COUNT(c.id) as chunk_count
FROM quiz_documents d
LEFT JOIN quiz_chunks c ON d.id = c.doc_id
WHERE d.content IS NOT NULL AND LENGTH(d.content) > 100
GROUP BY d.id, d.title, d.uploader_id
HAVING COUNT(c.id) > 0
ORDER BY chunk_count DESC
LIMIT 5;