import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { InterestCategory, ApiError, ApiSuccess } from '@/types/profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/interests/categories - Get all interest categories
export async function GET(request: NextRequest) {
  try {
    // Get all interest categories
    const { data: categories, error } = await supabase
      .from('interest_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Interest categories fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interest categories', details: error } as ApiError,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories as InterestCategory[]
    } as ApiSuccess<InterestCategory[]>);

  } catch (error) {
    console.error('Interest categories GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}