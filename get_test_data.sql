-- Get valid user IDs from auth.users
SELECT id as user_id, email FROM auth.users LIMIT 3;

-- Get valid document IDs with content
SELECT 
    qd.id as doc_id,
    qd.title,
    qd.uploader_id,
    LENGTH(qd.content) as content_length,
    COUNT(qc.id) as chunk_count
FROM quiz_documents qd
LEFT JOIN quiz_chunks qc ON qd.id = qc.doc_id
WHERE qd.content IS NOT NULL AND LENGTH(qd.content) > 100
GROUP BY qd.id, qd.title, qd.uploader_id, qd.content
HAVING COUNT(qc.id) > 0
LIMIT 3;