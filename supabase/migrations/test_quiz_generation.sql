-- Get existing document and user IDs for testing
SELECT 
  d.id as document_id,
  d.title,
  d.uploader_id as user_id,
  COUNT(c.id) as chunk_count
FROM quiz_documents d
LEFT JOIN quiz_chunks c ON d.id = c.doc_id
GROUP BY d.id, d.title, d.uploader_id
LIMIT 3;

-- Also check a sample of chunk content to verify text extraction
SELECT 
  LEFT(text, 200) as chunk_preview,
  LENGTH(text) as text_length
FROM quiz_chunks 
WHERE text IS NOT NULL 
LIMIT 3;