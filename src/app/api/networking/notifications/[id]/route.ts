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

    const notificationId = params.id;

    const { data: notification, error: notificationError } = await supabase
      .from('peer_notifications')
      .select(`
        *,
        sender:profiles!peer_notifications_sender_id_fkey(id, full_name, avatar_url),
        connection:connections(id, status, type),
        study_group:study_groups(id, name, subject)
      `)
      .eq('id', notificationId)
      .eq('recipient_id', user.id)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Error fetching notification:', error);
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

    const notificationId = params.id;
    const { read_status } = await request.json();

    // Validate read_status
    if (read_status && !['read', 'unread'].includes(read_status)) {
      return NextResponse.json({ error: 'Invalid read status' }, { status: 400 });
    }

    // Check if notification exists and belongs to user
    const { data: existingNotification } = await supabase
      .from('peer_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('recipient_id', user.id)
      .single();

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update the notification
    const { data: notification, error: updateError } = await supabase
      .from('peer_notifications')
      .update({ read_status })
      .eq('id', notificationId)
      .eq('recipient_id', user.id)
      .select(`
        *,
        sender:profiles!peer_notifications_sender_id_fkey(id, full_name, avatar_url),
        connection:connections(id, status, type),
        study_group:study_groups(id, name, subject)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }

    return NextResponse.json(notification);

  } catch (error) {
    console.error('Error updating notification:', error);
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

    const notificationId = params.id;

    // Check if notification exists and belongs to user
    const { data: existingNotification } = await supabase
      .from('peer_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('recipient_id', user.id)
      .single();

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Delete the notification
    const { error: deleteError } = await supabase
      .from('peer_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}