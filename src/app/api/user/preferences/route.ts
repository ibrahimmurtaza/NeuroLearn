import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get user from session
async function getUser(request: NextRequest) {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('sb-access-token');
  
  if (!authCookie) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(authCookie.value);
  return error ? null : user;
}

// GET /api/user/preferences - Get user language preferences
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user preferences from database
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return default preferences if none found
    if (!preferences) {
      return NextResponse.json({
        preferences: {
          preferredLanguage: 'en',
          autoTranslate: false,
          translationMode: 'side-by-side',
          showConfidence: true
        }
      });
    }

    return NextResponse.json({
      preferences: {
        preferredLanguage: preferences.preferred_language,
        autoTranslate: preferences.auto_translate,
        translationMode: preferences.translation_mode,
        showConfidence: preferences.show_confidence
      }
    });

  } catch (error) {
    console.error('User preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/user/preferences - Create or update user preferences
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferredLanguage, autoTranslate, translationMode, showConfidence } = body;

    // Validate input
    if (!preferredLanguage || typeof preferredLanguage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid preferred language' },
        { status: 400 }
      );
    }

    const validModes = ['side-by-side', 'stacked', 'translation-only'];
    if (translationMode && !validModes.includes(translationMode)) {
      return NextResponse.json(
        { error: 'Invalid translation mode' },
        { status: 400 }
      );
    }

    // Upsert user preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferred_language: preferredLanguage,
        auto_translate: autoTranslate ?? false,
        translation_mode: translationMode ?? 'side-by-side',
        show_confidence: showConfidence ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: {
        preferredLanguage: data.preferred_language,
        autoTranslate: data.auto_translate,
        translationMode: data.translation_mode,
        showConfidence: data.show_confidence
      }
    });

  } catch (error) {
    console.error('User preferences POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/preferences - Update specific preference fields
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updates: any = { updated_at: new Date().toISOString() };

    // Only update provided fields
    if (body.preferredLanguage !== undefined) {
      updates.preferred_language = body.preferredLanguage;
    }
    if (body.autoTranslate !== undefined) {
      updates.auto_translate = body.autoTranslate;
    }
    if (body.translationMode !== undefined) {
      const validModes = ['side-by-side', 'stacked', 'translation-only'];
      if (!validModes.includes(body.translationMode)) {
        return NextResponse.json(
          { error: 'Invalid translation mode' },
          { status: 400 }
        );
      }
      updates.translation_mode = body.translationMode;
    }
    if (body.showConfidence !== undefined) {
      updates.show_confidence = body.showConfidence;
    }

    // Update user preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: {
        preferredLanguage: data.preferred_language,
        autoTranslate: data.auto_translate,
        translationMode: data.translation_mode,
        showConfidence: data.show_confidence
      }
    });

  } catch (error) {
    console.error('User preferences PUT error:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}