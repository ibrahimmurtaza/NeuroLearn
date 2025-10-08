import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = (searchParams.get('type') || '').toLowerCase(); // 'connection' | 'group' | ''

    // Helper to map DB activity_type to UI expected types
    const mapType = (source: 'connection' | 'group', activity_type: string) => {
      if (source === 'group') {
        if (activity_type === 'member_joined') return 'group_joined';
        if (activity_type === 'message_posted') return 'message';
        return activity_type;
      }
      // connection
      if (activity_type === 'message_sent') return 'message';
      return activity_type;
    };

    // Fetch group activities (RLS restricts to member-visible rows)
    // NOTE: Temporarily disabled by default to avoid RLS recursion errors
    const groupQuery = supabase
      .from('group_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    // Fetch connection activities (RLS restricts to participant-visible rows)
    const connQuery = supabase
      .from('connection_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    let groupActivities: any[] = [];
    let connectionActivities: any[] = [];

    if (type === 'group') {
      const { data, error } = await groupQuery;
      if (error) {
        console.error('Error fetching group activities:', error);
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
      }
      groupActivities = data || [];
    } else if (type === 'connection') {
      const { data, error } = await connQuery;
      if (error) {
        console.error('Error fetching connection activities:', error);
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
      }
      connectionActivities = data || [];
    } else {
      // Default to connection-only to prevent recursion from group_memberships policies
      const { data: cData, error: cErr } = await connQuery;
      if (cErr) {
        console.error('Error fetching connection activities:', cErr);
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
      }
      connectionActivities = cData || [];
    }

    // Map to unified shape
    const mappedGroup = groupActivities.map((a) => ({
      id: a.id,
      type: mapType('group', a.activity_type),
      message: a.description || '',
      created_at: a.created_at,
      user_id: a.user_id,
      group_id: a.group_id,
      source: 'group' as const,
    }));

    const mappedConn = connectionActivities.map((a) => ({
      id: a.id,
      type: mapType('connection', a.activity_type),
      message: a.description || '',
      created_at: a.created_at,
      connection_id: a.connection_id,
      source: 'connection' as const,
    }));

    // Merge and sort
    const merged = [...mappedGroup, ...mappedConn].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Paginate after merge
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = merged.slice(start, end);

    // Count totals
    // Only count connection activities by default to avoid RLS recursion
    let total = 0;
    if (type === 'group') {
      const { count: groupCount } = await supabase
        .from('group_activities')
        .select('*', { count: 'exact', head: true });
      total = groupCount || 0;
    } else {
      const { count: connCount } = await supabase
        .from('connection_activities')
        .select('*', { count: 'exact', head: true });
      total = connCount || 0;
    }

    return NextResponse.json({
      activities: paged,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Unexpected error in activities endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}