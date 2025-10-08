import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let query = supabase
      .from('peer_notifications')
      .update({ read_status: 'read' })
      .eq('recipient_id', user.id)
      .eq('read_status', 'unread');

    // Apply type filter if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error: updateError } = await query.select('id');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Notifications marked as read successfully',
      updated_count: data?.length || 0
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}