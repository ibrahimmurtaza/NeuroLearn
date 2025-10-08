-- Fix infinite recursion in group_memberships RLS policies
-- The issue is that the RLS policy calls is_member_of_group() which queries group_memberships,
-- creating infinite recursion: policy -> function -> table -> policy -> function...

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Members can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group leaders can manage memberships" ON group_memberships;

-- Create simplified policies that don't cause recursion
-- Users can only see their own memberships
CREATE POLICY "Users can view their own memberships" ON group_memberships
    FOR SELECT USING (auth.uid() = user_id);

-- Users can join groups (insert their own membership)
-- This policy already exists and is fine
-- CREATE POLICY "Users can join groups" ON group_memberships
--     FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave groups (delete their own membership)  
-- This policy already exists and is fine
-- CREATE POLICY "Users can leave groups" ON group_memberships
--     FOR DELETE USING (auth.uid() = user_id);

-- Group creators can manage memberships in their groups
-- We'll use a direct query to study_groups instead of the helper function
CREATE POLICY "Group creators can manage memberships" ON group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM study_groups sg
            WHERE sg.id = group_memberships.group_id 
            AND sg.creator_id = auth.uid()
        )
    );

-- Also need to update the study groups policy that might cause issues
-- Drop and recreate the policy that uses is_member_of_group
DROP POLICY IF EXISTS "Members can view their groups" ON study_groups;

-- Create a simpler policy for members to view groups they belong to
-- This avoids the helper function and queries group_memberships directly
CREATE POLICY "Members can view their groups" ON study_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = study_groups.id 
            AND gm.user_id = auth.uid()
        )
    );

-- Update group activities policy to avoid recursion as well
DROP POLICY IF EXISTS "Members can view group activities" ON group_activities;
DROP POLICY IF EXISTS "Members can create group activities" ON group_activities;

CREATE POLICY "Members can view group activities" ON group_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_activities.group_id 
            AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create group activities" ON group_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_activities.group_id 
            AND gm.user_id = auth.uid()
        )
    );