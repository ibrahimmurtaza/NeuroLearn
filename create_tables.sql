-- Simple script to create peer networking tables
-- Run this in your Supabase SQL editor

-- Create study_groups table
CREATE TABLE IF NOT EXISTS study_groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    privacy_level TEXT CHECK (privacy_level IN ('public', 'private', 'invite_only')) DEFAULT 'public',
    max_members INTEGER DEFAULT 50,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
    group_id BIGINT REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('member', 'moderator', 'leader')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    id BIGSERIAL PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    connection_type TEXT CHECK (connection_type IN ('study_partner', 'project_collaborator', 'mentor', 'mentee')) DEFAULT 'study_partner',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);

-- Create peer_notifications table
CREATE TABLE IF NOT EXISTS peer_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('connection_request', 'connection_accepted', 'connection_rejected', 'group_invitation', 'group_activity', 'group_joined', 'group_left')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    related_id BIGINT,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_notifications ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view public groups" ON study_groups
    FOR SELECT USING (privacy_level = 'public' OR creator_id = auth.uid());

CREATE POLICY "Users can create groups" ON study_groups
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can view their own connections" ON connections
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests" ON connections
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their memberships" ON group_memberships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON peer_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON study_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON group_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON peer_notifications TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_groups_creator ON study_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_privacy ON study_groups(privacy_level);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);