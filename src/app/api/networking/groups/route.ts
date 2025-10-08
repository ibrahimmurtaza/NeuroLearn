import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  CreateStudyGroupRequest, 
  StudyGroupsResponse 
} from '@/shared/types/peer-networking';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create service role client for bypassing RLS when needed
    const serviceSupabase = createClient(true);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const privacy = searchParams.get('privacy');
    const subject = searchParams.get('subject');
    const my_groups = searchParams.get('my_groups') === 'true';
    const include_members = searchParams.get('include_members') === 'true';
    const offset = (page - 1) * limit;

    // Build base select - use service role for complex queries to avoid RLS recursion
    let query = serviceSupabase
      .from('study_groups')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (my_groups) {
      // Get groups where user is a member or creator
      const userGroupIds = await getUserGroupIds(serviceSupabase, user.id);
      if (userGroupIds.length > 0) {
        query = query.or(`creator_id.eq.${user.id},id.in.(${userGroupIds.join(',')})`);
      } else {
        // User has no group memberships, only show groups they created
        query = query.eq('creator_id', user.id);
      }
    } else if (privacy) {
      query = query.eq('privacy_level', privacy);
    } else {
      // Default to public groups if not filtering for user's groups
      query = query.eq('privacy_level', 'public');
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    // Get total count (apply same filters) - use service role to avoid RLS recursion
    let countQuery = serviceSupabase
      .from('study_groups')
      .select('*', { count: 'exact', head: true });

    if (my_groups) {
      const userGroupIds = await getUserGroupIds(serviceSupabase, user.id);
      if (userGroupIds.length > 0) {
        countQuery = countQuery.or(
          `creator_id.eq.${user.id},id.in.(${userGroupIds.join(',')})`
        );
      } else {
        // User has no group memberships, only count groups they created
        countQuery = countQuery.eq('creator_id', user.id);
      }
    } else if (privacy) {
      countQuery = countQuery.eq('privacy_level', privacy);
    } else {
      countQuery = countQuery.eq('privacy_level', 'public');
    }

    if (subject) {
      countQuery = countQuery.eq('subject', subject);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('Count query error (study_groups):', countError);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      console.error('Error fetching study groups:', groupsError);
      return NextResponse.json({ error: 'Failed to fetch study groups' }, { status: 500 });
    }

    const baseGroups = groups || [];

    // Fetch creator profiles
    const creatorIds = Array.from(new Set(baseGroups.map(g => g.creator_id).filter(Boolean)));
    let creatorProfiles: any[] = [];
    if (creatorIds.length > 0) {
      const { data: cp, error: cpError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', creatorIds);
      if (cpError) {
        console.error('Profiles fetch error (creators):', cpError);
      }
      creatorProfiles = cp || [];
    }
    const creatorMap = new Map((creatorProfiles || []).map(p => [p.id, p]));

    let transformedGroups = baseGroups.map(group => ({
      ...group,
      creator: creatorMap.get(group.creator_id) || null,
      member_count: 0,
      members: []
    }));

    if (include_members && baseGroups.length > 0) {
      const groupIds = baseGroups.map(g => g.id);
      const { data: memberships, error: membershipsError } = await serviceSupabase
        .from('group_memberships')
        .select('group_id, user_id, role, joined_at')
        .in('group_id', groupIds);

      if (!membershipsError && memberships && memberships.length > 0) {
        const memberUserIds = Array.from(new Set(memberships.map(m => m.user_id)));
        let memberProfiles: any[] = [];
        if (memberUserIds.length > 0) {
          const { data: mp, error: mpError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', memberUserIds);
          if (mpError) {
            console.error('Profiles fetch error (members):', mpError);
          }
          memberProfiles = mp || [];
        }
        const memberMap = new Map((memberProfiles || []).map(p => [p.id, p]));

        const membershipsByGroup = new Map<number, any[]>();
        for (const m of memberships) {
          const list = membershipsByGroup.get(m.group_id) || [];
          list.push({
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            user: memberMap.get(m.user_id) || null,
          });
          membershipsByGroup.set(m.group_id, list);
        }

        transformedGroups = transformedGroups.map(g => {
          const members = membershipsByGroup.get(g.id) || [];
          return {
            ...g,
            members,
            member_count: members.length,
          };
        });
      }
    }

    const response: StudyGroupsResponse = {
      groups: transformedGroups,
      total: count || 0,
      page,
      limit
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in study groups API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateStudyGroupRequest = await request.json();
    const { name, description, subject, privacy_level, max_members } = body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Group name must be less than 100 characters' }, { status: 400 });
    }

    // Create the study group
    const { data: newGroupRow, error: createError } = await supabase
      .from('study_groups')
      .insert({
        name: name.trim(),
        description: description?.trim(),
        subject,
        privacy_level: privacy_level || 'public',
        max_members: max_members || 50,
        creator_id: user.id
      })
      .select('*')
      .single();

    if (createError || !newGroupRow) {
      return NextResponse.json({ error: 'Failed to create study group' }, { status: 500 });
    }

    // Add creator as a leader member
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: newGroupRow.id,
        user_id: user.id,
        role: 'leader'
      });

    if (membershipError) {
      console.error('Failed to add creator as member:', membershipError);
      // Don't fail the request, but log the error
    }

    // Fetch the complete group with memberships
    // Build response group with creator and memberships
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id, user_id, role, joined_at')
      .eq('group_id', newGroupRow.id);

    const memberUserIds = Array.from(new Set((memberships || []).map(m => m.user_id)));
    const { data: memberProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', memberUserIds);
    const memberMap = new Map((memberProfiles || []).map(p => [p.id, p]));

    const membersDetailed = (memberships || []).map(m => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      user: memberMap.get(m.user_id) || null,
    }));

    const responseGroup = {
      ...newGroupRow,
      creator: creatorProfile || null,
      members: membersDetailed,
      member_count: membersDetailed.length,
    };

    return NextResponse.json(responseGroup, { status: 201 });

  } catch (error) {
    console.error('Error creating study group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get user's group IDs
async function getUserGroupIds(supabase: any, userId: string): Promise<number[]> {
  try {
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user group memberships:', error);
      return [];
    }

    if (!memberships || memberships.length === 0) {
      return [];
    }

    return memberships.map((m: any) => m.group_id);
  } catch (error) {
    console.error('Unexpected error in getUserGroupIds:', error);
    return [];
  }
}