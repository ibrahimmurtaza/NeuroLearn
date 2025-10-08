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
    const type = searchParams.get('type');

    let query = supabase
      .from('peer_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read_status', 'unread');

    // Apply type filter if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { count, error: countError } = await query;

    if (countError) {
      return NextResponse.json({ error: 'Failed to get unread count' }, { status: 500 });
    }

    return NextResponse.json({
      unread_count: count || 0,
      type: type || 'all'
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}