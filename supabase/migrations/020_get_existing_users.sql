-- Get existing user IDs from auth.users table
SELECT 
    id,
    email,
    created_at,
    confirmed_at
FROM auth.users 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Also check quiz_documents to see what uploader_ids are being used
SELECT DISTINCT 
    qd.uploader_id,
    u.email,
    COUNT(qd.id) as document_count
FROM quiz_documents qd
LEFT JOIN auth.users u ON qd.uploader_id = u.id
GROUP BY qd.uploader_id, u.email
ORDER BY document_count DESC;