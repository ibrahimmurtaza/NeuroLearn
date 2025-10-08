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
    const type = searchParams.get('type'); // 'sent' or 'received'

    let query = supabase
      .from('connections')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Filter by type
    if (type === 'sent') {
      query = query.eq('requester_id', user.id);
    } else if (type === 'received') {
      query = query.eq('receiver_id', user.id);
    } else {
      // Return both sent and received
      query = query.or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
    }

    const { data: connections, error: connectionsError } = await query;

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch pending connections' }, { status: 500 });
    }

    // Map profiles
    const allConnections = connections || [];
    const userIds = Array.from(
      new Set(allConnections.flatMap((c) => [c.requester_id, c.receiver_id]))
    );

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .in('id', userIds);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const mapped = allConnections.map((c) => ({
      ...c,
      requester: profileMap.get(c.requester_id) || null,
      receiver: profileMap.get(c.receiver_id) || null,
    }));

    // Separate sent and received if no type filter
    if (!type) {
      const sent = mapped.filter(conn => conn.requester_id === user.id);
      const received = mapped.filter(conn => conn.receiver_id === user.id);
      
      return NextResponse.json({
        sent,
        received,
        total: mapped.length || 0
      });
    }

    return NextResponse.json({
      connections: mapped,
      total: mapped.length || 0
    });

  } catch (error) {
    console.error('Error fetching pending connections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}