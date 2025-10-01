import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = params.id;
    const body = await request.json();
    const { is_active, sync_settings } = body;

    // Validate that at least one field is provided
    if (is_active === undefined && !sync_settings) {
      return NextResponse.json(
        { error: 'At least one field (is_active or sync_settings) is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sync_settings) updateData.sync_settings = sync_settings;

    // Update calendar connection
    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .update(updateData)
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating calendar connection:', error);
      return NextResponse.json({ error: 'Failed to update calendar connection' }, { status: 500 });
    }

    if (!connection) {
      return NextResponse.json({ error: 'Calendar connection not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      connection,
      message: 'Calendar connection updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = params.id;

    // Delete calendar connection
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting calendar connection:', error);
      return NextResponse.json({ error: 'Failed to delete calendar connection' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Calendar connection deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}