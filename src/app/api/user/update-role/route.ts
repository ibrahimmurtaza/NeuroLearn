import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let user: any = null;
    let authError: any = null;

    if (authHeader) {
      // Extract token from Bearer header
      const token = authHeader.replace('Bearer ', '');
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      authError = result.error;
    }

    // Fallback: recover user from cookies/session if bearer auth failed or missing
    if (!user) {
      const routeSupabase = createRouteHandlerClient({ cookies });
      const { data: sessionData, error: sessionResultError } = await routeSupabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
        authError = null;
      } else {
        authError = authError || sessionResultError;
      }
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { role } = await request.json();

    // Validate role
    if (!role || !['student', 'tutor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be either "student" or "tutor"' },
        { status: 400 }
      );
    }

    // Upsert user role in profiles table (create if doesn't exist, update if exists)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: role
      })
      .select('id, role')
      .single();

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: `User role updated to ${role} successfully`
    });

  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}