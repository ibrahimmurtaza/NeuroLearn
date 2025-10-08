import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ApiError, ApiSuccess } from '@/types/profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/tutor/subjects - Get all available subjects for tutors
export async function GET(request: NextRequest) {
  try {
    // Get all subjects from the database
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');

    if (error) {
      console.error('Subjects fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subjects', details: error } as ApiError,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: subjects
    } as ApiSuccess);

  } catch (error) {
    console.error('Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}