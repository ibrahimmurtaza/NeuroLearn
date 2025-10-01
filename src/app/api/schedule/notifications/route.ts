import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, sent, read
    const type = searchParams.get('type'); // task_reminder, goal_deadline, productivity_insight
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    return NextResponse.json({ 
      notifications,
      unread_count: unreadCount || 0
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      type, 
      title, 
      message, 
      scheduled_for, 
      related_id, 
      related_type,
      priority 
    } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['task_reminder', 'goal_deadline', 'productivity_insight', 'system_notification'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // Validate priority
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be low, medium, high, or urgent' },
        { status: 400 }
      );
    }

    // Create notification
    const notificationData = {
      user_id: user.id,
      type,
      title,
      message,
      scheduled_for: scheduled_for || new Date().toISOString(),
      related_id,
      related_type,
      priority: priority || 'medium',
      metadata: {
        created_via: 'api',
        source: 'schedule_planner'
      }
    };

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ 
      notification, 
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action, notification_ids } = body;

    // Validate required fields
    if (!action || !notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json(
        { error: 'Action and notification_ids array are required' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['mark_read', 'mark_unread', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be mark_read, mark_unread, or delete' },
        { status: 400 }
      );
    }

    let result;
    
    if (action === 'delete') {
      // Delete notifications
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notification_ids)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting notifications:', error);
        return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
      }

      result = { deleted_count: notification_ids.length };
    } else {
      // Update notification status
      const newStatus = action === 'mark_read' ? 'read' : 'pending';
      
      const { data: updatedNotifications, error } = await supabase
        .from('notifications')
        .update({ 
          status: newStatus,
          read_at: action === 'mark_read' ? new Date().toISOString() : null
        })
        .in('id', notification_ids)
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }

      result = { 
        updated_notifications: updatedNotifications,
        updated_count: updatedNotifications?.length || 0
      };
    }

    return NextResponse.json({ 
      ...result,
      message: `Notifications ${action.replace('_', ' ')} successfully`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}