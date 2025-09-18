import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { notebook_id } = await request.json();

    if (!notebook_id) {
      return NextResponse.json({ error: 'notebook_id is required' }, { status: 400 });
    }

    console.log('Clearing conversations for notebook:', notebook_id);

    // Delete conversations from database using service role
    const { data, error } = await supabase
      .from('conversations')
      .delete()
      .eq('notebook_id', notebook_id)
      .select();

    if (error) {
      console.error('Error deleting conversations:', error);
      return NextResponse.json({ 
        error: 'Failed to delete conversations', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('Successfully deleted conversations:', data);

    return NextResponse.json({ 
      success: true, 
      deletedCount: data?.length || 0,
      message: 'Conversations cleared successfully' 
    });
  } catch (error) {
    console.error('Unexpected error in clear conversations API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}