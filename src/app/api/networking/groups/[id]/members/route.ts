import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;

    // Check if user has access to view members
    const { data: group } = await supabase
      .from('study_groups')
      .select('privacy_level, creator_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    // Check if user is a member or if group is public
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const isMember = !!membership;
    const isCreator = group.creator_id === user.id;
    const isPublic = group.privacy_level === 'public';

    if (!isPublic && !isMember && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get group members
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        role,
        joined_at,
        user:profiles(id, full_name, avatar_url, bio)
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      total: members?.length || 0
    });

  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    const { user_id, role } = await request.json();

    // Validate input
    if (!user_id || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    if (!['member', 'moderator', 'leader'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if current user has permission to update roles
    const { data: group } = await supabase
      .from('study_groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    const { data: currentUserMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const isCreator = group.creator_id === user.id;
    const canManageRoles = isCreator || (currentUserMembership && ['leader', 'moderator'].includes(currentUserMembership.role));

    if (!canManageRoles) {
      return NextResponse.json({ error: 'Insufficient permissions to manage member roles' }, { status: 403 });
    }

    // Check if target user is a member
    const { data: targetMembership } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .single();

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this group' }, { status: 404 });
    }

    // Update the member's role
    const { data: updatedMembership, error: updateError } = await supabase
      .from('group_memberships')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', user_id)
      .select(`
        *,
        user:profiles(id, full_name, avatar_url, bio)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 });
    }

    return NextResponse.json(updatedMembership);

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('user_id');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if current user has permission to remove members
    const { data: group } = await supabase
      .from('study_groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    const { data: currentUserMembership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const isCreator = group.creator_id === user.id;
    const canRemoveMembers = isCreator || (currentUserMembership && ['leader', 'moderator'].includes(currentUserMembership.role));

    // Users can always remove themselves
    const isSelfRemoval = targetUserId === user.id;

    if (!canRemoveMembers && !isSelfRemoval) {
      return NextResponse.json({ error: 'Insufficient permissions to remove members' }, { status: 403 });
    }

    // Prevent creator from being removed
    if (targetUserId === group.creator_id && !isSelfRemoval) {
      return NextResponse.json({ error: 'Cannot remove the group creator' }, { status: 400 });
    }

    // Check if target user is a member
    const { data: targetMembership } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .single();

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this group' }, { status: 404 });
    }

    // Remove the member
    const { error: removeError } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (removeError) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Member removed successfully' });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}