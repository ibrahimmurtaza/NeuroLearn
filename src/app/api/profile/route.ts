import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Profile, ProfileFormData, ApiError, ApiSuccess } from '@/types/profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let user: User | null = null
    let authError: any = null

    if (authHeader) {
      // Extract token from Bearer header
      const token = authHeader.replace('Bearer ', '')
      const result = await supabase.auth.getUser(token)
      user = result.data.user
      authError = result.error
    }

    // Fallback: recover user from cookies/session if bearer auth failed or missing
    if (!user) {
      const routeSupabase = createRouteHandlerClient({ cookies })
      const { data: sessionData, error: sessionResultError } = await routeSupabase.auth.getSession()
      if (sessionData?.session?.user) {
        user = sessionData.session.user
        authError = null
      } else {
        authError = authError || sessionResultError
      }
    }

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' } as ApiError,
        { status: 401 }
      )
    }

    // Get user profile
    console.log('Profile API: Fetching profile for user:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('Profile API: Query result - profile:', !!profile, 'error:', profileError?.code);

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError } as ApiError,
        { status: 500 }
      );
    }

    const exists = !!profile;
    console.log('Profile API: Returning exists:', exists);

    return NextResponse.json({
      success: true,
      data: {
        profile: profile as Profile | null,
        exists: exists
      }
    } as ApiSuccess);

  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}

// POST /api/profile - Create user profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' } as ApiError,
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' } as ApiError,
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    console.log('POST /api/profile - Received body:', JSON.stringify(body, null, 2));

    // Validate required fields - only full_name is truly required for basic profile creation
    if (!body.full_name || !body.full_name.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: full_name' } as ApiError,
        { status: 400 }
      );
    }

    // Interests are optional but if provided should not be empty
    if (body.interests && body.interests.length === 0) {
      return NextResponse.json(
        { error: 'If interests are provided, at least one interest is required' } as ApiError,
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PUT to update.' } as ApiError,
        { status: 409 }
      );
    }

    // Get role from user metadata or default to student
    const role = user.user_metadata?.role || 'student';

    // Create new profile
    const profileData = {
      id: user.id,
      full_name: body.full_name.trim(),
      bio: body.bio?.trim() || null,
      academic_field: body.academic_field?.trim() || null,
      study_goals: body.study_goals?.trim() || null,
      interests: body.interests || [],
      avatar_url: body.avatar_url || null,
      role: role,
      // Additional fields from onboarding
      dob: body.dob || null,
      school: body.school?.trim() || null,
      grade_level: body.grade_level?.trim() || null
    };

    console.log('POST /api/profile - Profile data to insert:', JSON.stringify(profileData, null, 2));

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      console.error('Profile creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create profile', details: insertError } as ApiError,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newProfile as Profile,
      message: 'Profile created successfully'
    } as ApiSuccess<Profile>, { status: 201 });

  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' } as ApiError,
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' } as ApiError,
        { status: 401 }
      );
    }

    // Parse request body
    const body: Partial<ProfileFormData> = await request.json();
    console.log('Profile PUT: Received body:', JSON.stringify(body, null, 2));

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (body.full_name !== undefined) {
      if (!body.full_name || body.full_name.trim() === '') {
        return NextResponse.json(
          { error: 'full_name cannot be empty' } as ApiError,
          { status: 400 }
        );
      }
      updateData.full_name = body.full_name.trim();
    }
    if (body.bio !== undefined) {
      updateData.bio = body.bio?.trim() || null;
    }
    if (body.academic_field !== undefined) {
      if (!body.academic_field || body.academic_field.trim() === '') {
        return NextResponse.json(
          { error: 'academic_field cannot be empty' } as ApiError,
          { status: 400 }
        );
      }
      updateData.academic_field = body.academic_field.trim();
    }
    if (body.study_goals !== undefined) {
      if (!body.study_goals || body.study_goals.trim() === '') {
        return NextResponse.json(
          { error: 'study_goals cannot be empty' } as ApiError,
          { status: 400 }
        );
      }
      updateData.study_goals = body.study_goals.trim();
    }
    if (body.interests !== undefined) {
      if (!Array.isArray(body.interests) || body.interests.length === 0) {
        return NextResponse.json(
          { error: 'At least one interest is required' } as ApiError,
          { status: 400 }
        );
      }
      updateData.interests = body.interests;
    }
    if (body.avatar_url !== undefined) {
      updateData.avatar_url = body.avatar_url || null;
    }
    // Note: role should not be updated through this endpoint for security

    console.log('Profile PUT: Update data:', JSON.stringify(updateData, null, 2));

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update' } as ApiError,
        { status: 400 }
      );
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError } as ApiError,
        { status: 500 }
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Profile not found' } as ApiError,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile as Profile,
      message: 'Profile updated successfully'
    } as ApiSuccess<Profile>);

  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}

// DELETE /api/profile - Delete user profile
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' } as ApiError,
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' } as ApiError,
        { status: 401 }
      );
    }

    // Delete profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Profile deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete profile', details: deleteError } as ApiError,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    } as ApiSuccess);

  } catch (error) {
    console.error('Profile DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}