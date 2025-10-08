import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  CreateConnectionRequest, 
  ConnectionsResponse,
  ConnectionWithUsers 
} from '@/shared/types/peer-networking';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const offset = (page - 1) * limit;

    // Build query for connections (without FK-based profile joins)
    let query = supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('connection_type', type);
    }

    // Get total count for pagination (apply same filters as query)
    let countQuery = supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (type) {
      countQuery = countQuery.eq('connection_type', type);
    }

    const { count } = await countQuery;

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: connections, error: connectionsError } = await query;

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Map profiles for requester/receiver
    let mapped: ConnectionWithUsers[] = [];
    if (connections && connections.length > 0) {
      const userIds = Array.from(
        new Set(
          connections.flatMap((c) => [c.requester_id, c.receiver_id])
        )
      );

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio')
        .in('id', userIds);

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

      mapped = connections.map((c) => ({
        ...c,
        requester: profileMap.get(c.requester_id) || null,
        receiver: profileMap.get(c.receiver_id) || null,
      })) as ConnectionWithUsers[];
    }

    const response: ConnectionsResponse = {
      connections: mapped,
      total: count || 0,
      page,
      limit,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in connections API:', error);
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

    const body: CreateConnectionRequest = await request.json();
    const { receiver_id, connection_type, message } = body;

    // Validate input
    if (!receiver_id) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    if (receiver_id === user.id) {
      return NextResponse.json({ error: 'Cannot send connection request to yourself' }, { status: 400 });
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .single();

    if (existingConnection) {
      return NextResponse.json({ 
        error: 'Connection already exists',
        status: existingConnection.status 
      }, { status: 409 });
    }

    // Verify receiver exists
    const { data: receiverProfile, error: receiverError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiverProfile) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Create connection request
    const { data: newConnectionRow, error: createError } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        receiver_id,
        connection_type: connection_type || 'study_partner',
        message,
        status: 'pending'
      })
      .select('*')
      .single();

    if (createError || !newConnectionRow) {
      return NextResponse.json({ error: 'Failed to create connection request' }, { status: 500 });
    }

    // Fetch profiles for requester and receiver
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .in('id', [user.id, receiver_id]);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const newConnection: ConnectionWithUsers = {
      ...newConnectionRow,
      requester: profileMap.get(user.id) || null,
      receiver: profileMap.get(receiver_id) || null,
    } as ConnectionWithUsers;

    return NextResponse.json(newConnection, { status: 201 });

  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}