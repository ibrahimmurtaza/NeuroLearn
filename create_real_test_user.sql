-- Create a real test user in auth.users table with proper structure
-- First, let's check what columns exist in auth.users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Insert a test user with minimal required fields
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'testuser@example.com',
    '$2a$10$dummy.encrypted.password.hash.for.testing.purposes.only',
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verify the user was created
SELECT id, email, role, created_at FROM auth.users WHERE id = '22222222-2222-2222-2222-222222222222';