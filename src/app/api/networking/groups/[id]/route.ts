import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateStudyGroupRequest } from '@/shared/types/peer-networking';

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

    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        *,
        creator:profiles!study_groups_creator_id_fkey(id, full_name, avatar_url),
        memberships:group_memberships(
          user_id,
          role,
          joined_at,
          user:profiles(id, full_name, avatar_url)
        )
      `)
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    // Check if user has access to this group
    const isMember = group.memberships?.some((m: any) => m.user_id === user.id);
    const isCreator = group.creator_id === user.id;
    const isPublic = group.privacy_level === 'public';

    if (!isPublic && !isMember && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const responseGroup = {
      ...group,
      member_count: group.memberships?.length || 0,
      members: group.memberships || []
    };

    return NextResponse.json(responseGroup);

  } catch (error) {
    console.error('Error fetching study group:', error);
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
    const body: UpdateStudyGroupRequest = await request.json();

    // Get the group to verify permissions
    const { data: group, error: fetchError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    // Check if user is the creator or has moderator/leader role
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    const isCreator = group.creator_id === user.id;
    const canEdit = isCreator || (membership && ['leader', 'moderator'].includes(membership.role));

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions to edit this group' }, { status: 403 });
    }

    // Validate input
    if (body.name && body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name cannot be empty' }, { status: 400 });
    }

    if (body.name && body.name.length > 100) {
      return NextResponse.json({ error: 'Group name must be less than 100 characters' }, { status: 400 });
    }

    // Update the group
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim();
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.privacy_level !== undefined) updateData.privacy_level = body.privacy_level;
    if (body.max_members !== undefined) updateData.max_members = body.max_members;

    const { data: updatedGroup, error: updateError } = await supabase
      .from('study_groups')
      .update(updateData)
      .eq('id', groupId)
      .select(`
        *,
        creator:profiles!study_groups_creator_id_fkey(id, full_name, avatar_url),
        memberships:group_memberships(
          user_id,
          role,
          joined_at,
          user:profiles(id, full_name, avatar_url)
        )
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update study group' }, { status: 500 });
    }

    const responseGroup = {
      ...updatedGroup,
      member_count: updatedGroup.memberships?.length || 0,
      members: updatedGroup.memberships || []
    };

    return NextResponse.json(responseGroup);

  } catch (error) {
    console.error('Error updating study group:', error);
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

    // Get the group to verify permissions
    const { data: group, error: fetchError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (fetchError || !group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    // Only the creator can delete the group
    if (group.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
    }

    // Delete the group (memberships will be deleted automatically due to CASCADE)
    const { error: deleteError } = await supabase
      .from('study_groups')
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete study group' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Study group deleted successfully' });

  } catch (error) {
    console.error('Error deleting study group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}