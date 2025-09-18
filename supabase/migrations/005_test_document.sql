-- Insert a test document for batch summarization testing
INSERT INTO documents (
  id,
  user_id,
  filename,
  file_type,
  storage_path,
  metadata,
  processing_status
) VALUES (
  'b24bb10f-1e15-432a-9f76-41e2a2a8794f',
  NULL,
  'test-document.txt',
  'text/plain',
  '/test/test-document.txt',
  '{"size": 1024, "pages": 1}',
  'completed'
) ON CONFLICT (id) DO UPDATE SET
  filename = EXCLUDED.filename,
  file_type = EXCLUDED.file_type,
  storage_path = EXCLUDED.storage_path,
  metadata = EXCLUDED.metadata,
  processing_status = EXCLUDED.processing_status,
  updated_at = now();