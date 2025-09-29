-- Create a test user for quiz generation testing
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@