-- Check what documents and chunks actually exist
SELECT 
    'Documents' as table_name,
    COUNT(*) as count
FROM quiz_documents
UNION ALL
SELECT 
    'Chunks' as table_name,
    COUNT(*) as count
FROM quiz_chunks;

-- Get actual document IDs and their chunk counts
SELECT 
    d.id,
    d.title,
    d.source_type,
    d.uploader_id,
    COUNT(c.id) as chunk_count,
    LENGTH(d.content) as content_length
FROM quiz_documents d
LEFT JOIN quiz_chunks c ON d.id = c.doc_id
GROUP BY d.id, d.title, d.source_type, d.uploader_id
ORDER BY chunk_count DESC, content_length DESC
LIMIT 10;

-- Check if there are any chunks at all
SELECT 
    c.id,
    c.doc_id,
    LEFT(c.text, 100) as text_preview,
    LENGTH(c.text) as text_length
FROM quiz_chunks c
LIMIT 5;