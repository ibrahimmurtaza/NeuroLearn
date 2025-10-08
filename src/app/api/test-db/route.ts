import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();

    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        error: 'Authentication error',
        details: authError.message
      }, { status: 401 });
    }

    // Test if study_groups table exists
    const { data: groupsData, error: groupsError } = await supabase
      .from('study_groups')
      .select('count')
      .limit(1);

    // Test if profiles table exists
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    const results = {
      auth: {
        user: user ? user.id : null,
        error: authError?.message || null
      },
      study_groups: {
        exists: !groupsError,
        error: groupsError?.message || null,
        data: groupsData || null
      },
      profiles: {
        exists: !profilesError,
        error: profilesError?.message || null,
        data: profilesData || null
      }
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}