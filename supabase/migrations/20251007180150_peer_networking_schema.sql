-- =============================================
-- PEER NETWORKING MODULE DATABASE SCHEMA
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Connections table for peer relationships
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

-- Study groups table
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

-- Group memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
    group_id BIGINT REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('member', 'moderator', 'leader')) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- Peer networking notifications table (separate from existing notifications)
CREATE TABLE IF NOT EXISTS peer_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('connection_request', 'connection_accepted', 'connection_rejected', 'group_invitation', 'group_activity', 'group_joined', 'group_left')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    related_id BIGINT, -- Can reference connections.id or study_groups.id
    related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- The other user involved
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connection activities tracking table
CREATE TABLE IF NOT EXISTS connection_activities (
    id BIGSERIAL PRIMARY KEY,
    connection_id BIGINT REFERENCES connections(id) ON DELETE CASCADE,
    activity_type TEXT CHECK (activity_type IN ('message_sent', 'study_session', 'file_shared', 'collaboration')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group activities tracking table
CREATE TABLE IF NOT EXISTS group_activities (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT CHECK (activity_type IN ('member_joined', 'member_left', 'message_posted', 'file_shared', 'session_scheduled')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Connections indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_created_at ON connections(created_at);

-- Study groups indexes
CREATE INDEX IF NOT EXISTS idx_study_groups_creator ON study_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_privacy ON study_groups(privacy_level);
CREATE INDEX IF NOT EXISTS idx_study_groups_subject ON study_groups(subject);

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(role);

-- Peer notifications indexes
CREATE INDEX IF NOT EXISTS idx_peer_notifications_user ON peer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_peer_notifications_type ON peer_notifications(type);
CREATE INDEX IF NOT EXISTS idx_peer_notifications_read ON peer_notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_peer_notifications_created ON peer_notifications(created_at);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_connection_activities_connection ON connection_activities(connection_id);
CREATE INDEX IF NOT EXISTS idx_connection_activities_type ON connection_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_group_activities_group ON group_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_user ON group_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_group_activities_type ON group_activities(activity_type);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activities ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Users can view their own connections" ON connections
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests" ON connections
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their received connections" ON connections
    FOR UPDATE USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own connections" ON connections
    FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Study groups policies
CREATE POLICY "Anyone can view public groups" ON study_groups
    FOR SELECT USING (privacy_level = 'public' OR creator_id = auth.uid());

-- Helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION is_member_of_group(g_id BIGINT, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = g_id AND gm.user_id = u_id
  );
$$;

CREATE OR REPLACE FUNCTION is_group_leader_or_moderator(g_id BIGINT, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_memberships gm
    WHERE gm.group_id = g_id AND gm.user_id = u_id AND gm.role IN ('leader','moderator')
  );
$$;

CREATE POLICY "Members can view their groups" ON study_groups
    FOR SELECT USING (
        is_member_of_group(study_groups.id, auth.uid())
    );

CREATE POLICY "Authenticated users can create groups" ON study_groups
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups" ON study_groups
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their groups" ON study_groups
    FOR DELETE USING (auth.uid() = creator_id);

-- Group memberships policies
CREATE POLICY "Members can view group memberships" ON group_memberships
    FOR SELECT USING (
        user_id = auth.uid() OR
        is_member_of_group(group_memberships.group_id, auth.uid())
    );

CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON group_memberships
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group leaders can manage memberships" ON group_memberships
    FOR ALL USING (
        is_group_leader_or_moderator(group_memberships.group_id, auth.uid())
    );

-- Peer notifications policies
CREATE POLICY "Users can view their own notifications" ON peer_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications" ON peer_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON peer_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications" ON peer_notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Connection activities policies
CREATE POLICY "Users can view activities in their connections" ON connection_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM connections c
            WHERE c.id = connection_activities.connection_id
            AND (c.requester_id = auth.uid() OR c.receiver_id = auth.uid())
        )
    );

CREATE POLICY "Users can create activities in their connections" ON connection_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM connections c
            WHERE c.id = connection_activities.connection_id
            AND (c.requester_id = auth.uid() OR c.receiver_id = auth.uid())
        )
    );

-- Group activities policies
CREATE POLICY "Members can view group activities" ON group_activities
    FOR SELECT USING (
        is_member_of_group(group_activities.group_id, auth.uid())
    );

CREATE POLICY "Members can create group activities" ON group_activities
    FOR INSERT WITH CHECK (
        is_member_of_group(group_activities.group_id, auth.uid())
    );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Create trigger function for updated_at if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at
    BEFORE UPDATE ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON group_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON peer_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON connection_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_activities TO authenticated;

-- Grant read permissions to anonymous users for public data
GRANT SELECT ON study_groups TO anon;