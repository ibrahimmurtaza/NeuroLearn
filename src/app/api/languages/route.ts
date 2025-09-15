import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/languages - Get all supported languages
export async function GET(request: NextRequest) {
  try {
    // Get all supported languages from database
    const { data: languages, error } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching languages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch languages' },
        { status: 500 }
      );
    }

    // Transform data for frontend consumption
    const formattedLanguages = languages.map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.native_name,
      flag: lang.flag_emoji,
      isRtl: lang.is_rtl
    }));

    return NextResponse.json({
      languages: formattedLanguages,
      total: formattedLanguages.length
    });

  } catch (error) {
    console.error('Languages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}