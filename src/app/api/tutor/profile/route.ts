import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TutorOnboardingFormData, ApiError, ApiSuccess } from '@/types/profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client with service role for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/tutor/profile - Get tutor profile with subjects
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

    // Get tutor profile from profiles table
    const { data: tutorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'tutor')
      .single();

    if (profileError || !tutorProfile) {
      console.error('Tutor profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Tutor profile not found' } as ApiError,
        { status: 404 }
      );
    }

    // If tutor has subjects, fetch the subject details
    let tutorProfileWithSubjects = tutorProfile;
    if (tutorProfile.tutor_subjects && Array.isArray(tutorProfile.tutor_subjects) && tutorProfile.tutor_subjects.length > 0) {
      const subjectIds = tutorProfile.tutor_subjects.map((ts: any) => ts.subject_id);
      
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .in('id', subjectIds);

      if (!subjectsError && subjects) {
        // Combine subject details with tutor subject data
        const subjectsWithDetails = tutorProfile.tutor_subjects.map((ts: any) => {
          const subject = subjects.find(s => s.id === ts.subject_id);
          return {
            ...ts,
            subject: subject || null
          };
        });

        tutorProfileWithSubjects = {
          ...tutorProfile,
          subjects: subjectsWithDetails
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: tutorProfileWithSubjects
    } as ApiSuccess);

  } catch (error) {
    console.error('Tutor profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}

// POST /api/tutor/profile - Create or update tutor profile
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

    // Verify user is a tutor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'tutor') {
      return NextResponse.json(
        { error: 'Access denied. Tutor role required.' } as ApiError,
        { status: 403 }
      );
    }

    // Parse request body
    const body: TutorOnboardingFormData = await request.json();

    // Validate required fields
    if (!body.experience_years || !body.hourly_rate || !body.subjects || body.subjects.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: experience_years, hourly_rate, subjects' } as ApiError,
        { status: 400 }
      );
    }

    // Update the profiles table with all user information (both basic and tutor-specific)
    const profileUpdateData: any = {
      id: user.id,
      role: 'tutor' // Ensure role is set to tutor
    };

    // Add basic profile fields if they exist in the request body
    if (body.full_name) profileUpdateData.full_name = body.full_name;
    if (body.bio) profileUpdateData.bio = body.bio;

    // Add tutor-specific fields - only process fields that are actually sent from the frontend
    if (body.hourly_rate !== undefined) profileUpdateData.hourly_rate = body.hourly_rate;
    if (body.experience_years !== undefined) profileUpdateData.experience_years = body.experience_years;
    if (body.education) profileUpdateData.education = body.education;
    if (body.languages) profileUpdateData.languages = body.languages;

    // Handle availability as JSONB field
    if (body.availability) {
      // Map common availability patterns to status
      const availabilityLower = body.availability.toLowerCase();
      let status = 'available'; // default
      
      if (availabilityLower.includes('busy') || availabilityLower.includes('not available')) {
        status = 'busy';
      } else if (availabilityLower.includes('offline') || availabilityLower.includes('unavailable')) {
        status = 'offline';
      }
      
      // Store as JSONB object
      profileUpdateData.availability = {
        status: status,
        details: body.availability
      };
    }

    const { data: tutorProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileUpdateData)
      .select()
      .single();

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError } as ApiError,
        { status: 500 }
      );
    }

    // Update tutor_subjects in the profile as JSONB array
    if (body.subjects && Array.isArray(body.subjects)) {
      const tutorSubjectsData = body.subjects.map(subjectId => ({
        subject_id: subjectId,
        specializations: [],
        proficiency_level: 'intermediate'
      }));

      const { error: subjectsError } = await supabase
        .from('profiles')
        .update({ tutor_subjects: tutorSubjectsData })
        .eq('id', user.id);

      if (subjectsError) {
        console.error('Tutor subjects update error:', subjectsError);
        return NextResponse.json(
          { error: 'Failed to update tutor subjects', details: subjectsError } as ApiError,
          { status: 500 }
        );
      }
    }

    // Get the complete tutor profile with subjects using direct query
    const { data: profileWithSubjects, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'tutor')
      .single();

    if (fetchError) {
      console.error('Failed to fetch complete profile:', fetchError);
      // Still return success since the profile was created, just without subjects data
      return NextResponse.json({
        success: true,
        data: tutorProfile,
        message: 'Tutor profile created successfully'
      } as ApiSuccess, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      data: profileWithSubjects,
      message: 'Tutor profile created successfully'
    } as ApiSuccess, { status: 201 });

  } catch (error) {
    console.error('Tutor profile POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiError,
      { status: 500 }
    );
  }
}