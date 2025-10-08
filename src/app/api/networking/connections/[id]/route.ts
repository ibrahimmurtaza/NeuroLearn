import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateConnectionRequest } from '@/shared/types/peer-networking';

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

    const connectionId = params.id;

    const { data: connectionRow, error: connectionError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .single();

    if (connectionError || !connectionRow) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Map profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .in('id', [connectionRow.requester_id, connectionRow.receiver_id]);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const connection = {
      ...connectionRow,
      requester: profileMap.get(connectionRow.requester_id) || null,
      receiver: profileMap.get(connectionRow.receiver_id) || null,
    };

    return NextResponse.json(connection);

  } catch (error) {
    console.error('Error fetching connection:', error);
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

    const connectionId = params.id;
    const body: UpdateConnectionRequest = await request.json();
    const { status } = body;

    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get the connection to verify permissions
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Only the receiver can update the connection status
    if (connection.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Only the receiver can update connection status' }, { status: 403 });
    }

    // Only pending connections can be updated
    if (connection.status !== 'pending') {
      return NextResponse.json({ error: 'Connection is not pending' }, { status: 400 });
    }

    // Update the connection
    const { data: updatedConnectionRow, error: updateError } = await supabase
      .from('connections')
      .update({ status })
      .eq('id', connectionId)
      .select('*')
      .single();

    if (updateError || !updatedConnectionRow) {
      return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .in('id', [updatedConnectionRow.requester_id, updatedConnectionRow.receiver_id]);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const updatedConnection = {
      ...updatedConnectionRow,
      requester: profileMap.get(updatedConnectionRow.requester_id) || null,
      receiver: profileMap.get(updatedConnectionRow.receiver_id) || null,
    };

    return NextResponse.json(updatedConnection);

  } catch (error) {
    console.error('Error updating connection:', error);
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

    const connectionId = params.id;

    // Get the connection to verify permissions
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Only participants can delete the connection
    if (connection.requester_id !== user.id && connection.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this connection' }, { status: 403 });
    }

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Connection deleted successfully' });

  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}