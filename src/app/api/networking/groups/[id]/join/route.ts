import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JoinGroupRequest } from '@/shared/types/peer-networking';

export async function POST(
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
    const body: JoinGroupRequest = await request.json();

    // Get the group details
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member of this group' }, { status: 409 });
    }

    // Check group privacy and invitation code
    if (group.privacy_level === 'private' || group.privacy_level === 'invite_only') {
      if (!body.invitation_code || body.invitation_code !== group.invitation_code) {
        return NextResponse.json({ error: 'Invalid or missing invitation code' }, { status: 403 });
      }
    }

    // Check if group is at capacity
    const { count: memberCount } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (memberCount && memberCount >= group.max_members) {
      return NextResponse.json({ error: 'Group is at maximum capacity' }, { status: 409 });
    }

    // Add user to the group
    const { data: membership, error: joinError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: parseInt(groupId),
        user_id: user.id,
        role: 'member'
      })
      .select(`
        *,
        user:profiles(id, full_name, avatar_url)
      `)
      .single();

    if (joinError) {
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
    }

    return NextResponse.json(membership, { status: 201 });

  } catch (error) {
    console.error('Error joining group:', error);
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

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 404 });
    }

    // Check if user is the group creator/leader
    const { data: group } = await supabase
      .from('study_groups')
      .select('creator_id')
      .eq('id', groupId)
      .single();

    if (group && group.creator_id === user.id) {
      return NextResponse.json({ 
        error: 'Group creator cannot leave the group. Transfer leadership or delete the group instead.' 
      }, { status: 400 });
    }

    // Remove user from the group
    const { error: leaveError } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (leaveError) {
      return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Successfully left the group' });

  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}