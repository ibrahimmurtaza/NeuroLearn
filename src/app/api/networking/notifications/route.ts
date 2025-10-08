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
    const type = searchParams.get('type');
    const read_status = searchParams.get('read_status');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('peer_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (read_status) {
      const v = read_status.toLowerCase();
      const readBool = v === 'read' || v === 'true' ? true : v === 'unread' || v === 'false' ? false : null;
      if (readBool !== null) {
        query = query.eq('read_status', readBool);
      }
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('peer_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (type) {
      countQuery = countQuery.eq('type', type);
    }

    if (read_status) {
      const v = read_status.toLowerCase();
      const readBool = v === 'read' || v === 'true' ? true : v === 'unread' || v === 'false' ? false : null;
      if (readBool !== null) {
        countQuery = countQuery.eq('read_status', readBool);
      }
    }

    const { count: totalCount } = await countQuery;

    // Map to frontend-friendly shape (expose `read` boolean)
    const mapped = (notifications || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: !!n.read_status,
      created_at: n.created_at,
      related_id: n.related_id,
      related_user_id: n.related_user_id,
    }));

    return NextResponse.json({
      notifications: mapped,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
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

    const {
      recipient_id,
      type,
      title,
      message,
      connection_id,
      group_id,
      metadata
    } = await request.json();

    // Validate required fields
    if (!recipient_id || !type || !title || !message) {
      return NextResponse.json({ 
        error: 'Recipient ID, type, title, and message are required' 
      }, { status: 400 });
    }

    // Validate notification type
    const validTypes = [
      'connection_request',
      'connection_accepted',
      'connection_rejected',
      'group_invitation',
      'group_request',
      'group_accepted',
      'group_rejected',
      'group_activity',
      'study_reminder',
      'achievement'
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Create the notification
    const { data: notification, error: createError } = await supabase
      .from('peer_notifications')
      .insert({
        recipient_id,
        sender_id: user.id,
        type,
        title,
        message,
        connection_id: connection_id || null,
        group_id: group_id || null,
        metadata: metadata || {},
        read_status: 'unread'
      })
      .select(`
        *,
        sender:profiles!peer_notifications_sender_id_fkey(id, full_name, avatar_url),
        connection:connections(id, status, type),
        study_group:study_groups(id, name, subject)
      `)
      .single();

    if (createError) {
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json(notification, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}