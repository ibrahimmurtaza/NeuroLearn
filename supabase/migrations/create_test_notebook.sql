-- Create a test notebook for file upload testing
INSERT INTO notebooks (id, title, description, user_id, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Notebook for File Upload',
  'This is a test notebook created for testing file upload functionality',
  '550e8400-e29b-41d4-a716-446655440001', -- Test user ID
  NOW(),
  NOW()
);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON notebooks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON notebooks TO authenticated;