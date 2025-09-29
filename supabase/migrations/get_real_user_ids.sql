-- Get real user IDs from auth.users table
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
LIMIT 3;

-- Get real document IDs with their uploader info
SELECT 
  d.id as document_id,
  d.title,
  d.uploader_id,
  u.email as uploader_email
FROM quiz_documents d
JOIN auth.users u ON d.uploader_id = u.id
LIMIT 3;