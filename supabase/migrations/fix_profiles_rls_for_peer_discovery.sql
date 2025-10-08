-- Fix profiles RLS policies to allow peer discovery
-- The current policy only allows users to view their own profile,
-- but peer discovery requires users to see other profiles

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

-- Create a new policy that allows peer discovery
CREATE POLICY "Users can view profiles for peer discovery" ON profiles 
    FOR SELECT TO authenticated USING (
        -- Users can always see their own profile
        auth.uid() = id 
        OR 
        -- Users can see other profiles for peer discovery (excluding sensitive data through API layer)
        true
    );

-- Drop and recreate other policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Users can still only create/update/delete their own profiles
CREATE POLICY "Users can create their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;