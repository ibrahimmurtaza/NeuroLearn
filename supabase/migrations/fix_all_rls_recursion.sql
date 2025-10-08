-- Comprehensive fix for infinite recursion in RLS policies
-- The issue is that RLS policies are calling helper functions that query the same tables,
-- creating infinite recursion loops

-- First, let's drop all problematic policies that cause recursion

-- Drop study_groups policies
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON study_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON study_groups;
DROP POLICY IF EXISTS "Creators can manage their groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create groups" ON study_groups;

-- Drop group_memberships policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON group_memberships;
DROP POLICY IF EXISTS "Members can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group leaders can manage memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group creators can manage memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;

-- Drop group_activities policies
DROP POLICY IF EXISTS "Members can view group activities" ON group_activities;
DROP POLICY IF EXISTS "Members can create group activities" ON group_activities;
DROP POLICY IF EXISTS "Group members can view activities" ON group_activities;
DROP POLICY IF EXISTS "Group members can create activities" ON group_activities;

-- Now create simple, non-recursive policies

-- STUDY_GROUPS policies
-- 1. Public groups are viewable by everyone
CREATE POLICY "Public groups are viewable by everyone" ON study_groups
    FOR SELECT USING (privacy_level = 'public');

-- 2. Creators can view and manage their own groups
CREATE POLICY "Creators can manage their groups" ON study_groups
    FOR ALL USING (creator_id = auth.uid());

-- 3. Users can create groups
CREATE POLICY "Users can create groups" ON study_groups
    FOR INSERT WITH CHECK (creator_id = auth.uid());

-- 4. Members can view groups they belong to (simplified to avoid recursion)
-- We'll handle member access through the API layer instead of RLS to avoid recursion
-- For now, only allow public groups and creator access through RLS

-- GROUP_MEMBERSHIPS policies (simplified to avoid recursion)
-- 1. Users can view their own memberships only
CREATE POLICY "Users can view their own memberships" ON group_memberships
    FOR SELECT USING (user_id = auth.uid());

-- 2. Users can join groups (insert their own membership)
CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Users can leave groups (delete their own membership)
CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (user_id = auth.uid());

-- 4. Group creators can manage memberships (simplified)
CREATE POLICY "Group creators can manage memberships" ON group_memberships
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM study_groups sg 
            WHERE sg.id = group_memberships.group_id 
            AND sg.creator_id = auth.uid()
        )
    );

-- GROUP_ACTIVITIES policies (simplified)
-- 1. Users can view their own activities
CREATE POLICY "Users can view their own activities" ON group_activities
    FOR SELECT USING (user_id = auth.uid());

-- 2. Users can create activities (basic check)
CREATE POLICY "Users can create group activities" ON group_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 3. Users can manage their own activities
CREATE POLICY "Users can manage their own activities" ON group_activities
    FOR ALL USING (user_id = auth.uid());

-- Note: We've simplified these policies to avoid recursion.
-- The API layer will handle more complex access control logic
-- by using service role queries when needed.