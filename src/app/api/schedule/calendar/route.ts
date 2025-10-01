import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Retry utility function for Supabase operations
async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection timeout or network error
      if (error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          error?.message?.includes('timeout') ||
          error?.message?.includes('network') ||
          error?.status >= 500) {
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Calendar API - Supabase operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If it's not a retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Calendar API GET - Request received');
    const supabase = createClient();
    
    // Get authenticated user with retry mechanism and comprehensive logging
    console.log('Calendar API GET - Attempting to get user...');
    let user: any = null;
    let authError: any = null;
    
    try {
      const userResult = await retrySupabaseOperation(async () => {
        return await supabase.auth.getUser();
      });
      user = userResult.data?.user;
      authError = userResult.error;
      
      console.log('Calendar API GET - User authentication result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      });
    } catch (error: any) {
      console.error('Calendar API GET - Failed to get user after retries:', error);
      authError = error;
    }
    
    // Fallback: Try to get session if user authentication failed
    if (authError || !user) {
      console.log('Calendar API GET - User auth failed, trying session fallback...');
      try {
        const sessionResult = await retrySupabaseOperation(async () => {
          return await supabase.auth.getSession();
        });
        
        const sessionData = sessionResult.data;
        console.log('Calendar API GET - Session fallback result:', {
          hasSession: !!sessionData?.session,
          hasSessionUser: !!sessionData?.session?.user,
          sessionUserId: sessionData?.session?.user?.id,
          sessionUserEmail: sessionData?.session?.user?.email,
          sessionError: sessionResult.error?.message
        });
        
        if (sessionData?.session?.user) {
          user = sessionData.session.user;
          authError = null;
          console.log('Calendar API GET - Successfully recovered user from session');
        }
      } catch (sessionError: any) {
        console.error('Calendar API GET - Session fallback also failed:', sessionError);
      }
    }
    
    if (authError || !user) {
      console.error('Calendar API GET - Authentication failed completely:', {
        authError: authError?.message,
        hasUser: !!user,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      });
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: authError?.message || 'No user found'
      }, { status: 401 });
    }
    
    console.log('Calendar API GET - Authentication successful, fetching connections for user:', user.id);

    // Get user's calendar connections
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching calendar connections:', error);
      return NextResponse.json({ error: 'Failed to fetch calendar connections' }, { status: 500 });
    }

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Calendar API POST - Request received');
    const supabase = createClient();
    
    // Get authenticated user with retry mechanism and comprehensive logging
    console.log('Calendar API POST - Attempting to get user...');
    let user: any = null;
    let authError: any = null;
    
    try {
      const userResult = await retrySupabaseOperation(async () => {
        return await supabase.auth.getUser();
      });
      user = userResult.data?.user;
      authError = userResult.error;
      
      console.log('Calendar API POST - User authentication result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      });
    } catch (error: any) {
      console.error('Calendar API POST - Failed to get user after retries:', error);
      authError = error;
    }
    
    // Fallback: Try to get session if user authentication failed
    if (authError || !user) {
      console.log('Calendar API POST - User auth failed, trying session fallback...');
      try {
        const sessionResult = await retrySupabaseOperation(async () => {
          return await supabase.auth.getSession();
        });
        
        const sessionData = sessionResult.data;
        console.log('Calendar API POST - Session fallback result:', {
          hasSession: !!sessionData?.session,
          hasSessionUser: !!sessionData?.session?.user,
          sessionUserId: sessionData?.session?.user?.id,
          sessionUserEmail: sessionData?.session?.user?.email,
          sessionError: sessionResult.error?.message
        });
        
        if (sessionData?.session?.user) {
          user = sessionData.session.user;
          authError = null;
          console.log('Calendar API POST - Successfully recovered user from session');
        }
      } catch (sessionError: any) {
        console.error('Calendar API POST - Session fallback also failed:', sessionError);
      }
    }
    
    if (authError || !user) {
      console.error('Calendar API POST - Authentication failed completely:', {
        authError: authError?.message,
        hasUser: !!user,
        cookies: request.headers.get('cookie') ? 'present' : 'missing'
      });
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: authError?.message || 'No user found'
      }, { status: 401 });
    }
    
    console.log('Calendar API POST - Authentication successful for user:', user.id);

    // Parse request body
    const body = await request.json();
    const { provider, access_token, refresh_token, calendar_id, calendar_name } = body;

    // Validate required fields
    if (!provider || !access_token) {
      return NextResponse.json(
        { error: 'Provider and access_token are required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!['google', 'outlook', 'apple'].includes(provider)) {
      return NextResponse.json(
        { error: 'Provider must be google, outlook, or apple' },
        { status: 400 }
      );
    }

    // Check if connection already exists for this provider
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();

    if (existingConnection) {
      return NextResponse.json(
        { error: `${provider} calendar is already connected` },
        { status: 409 }
      );
    }

    // Create calendar connection
    const connectionData = {
      user_id: user.id,
      provider,
      external_calendar_id: calendar_id || `${provider}-calendar-${Date.now()}`,
      calendar_name: calendar_name || `${provider} Calendar`,
      auth_tokens: {
        access_token,
        refresh_token
      },
      is_active: true,
      sync_settings: {
        sync_tasks: true,
        sync_goals: false,
        auto_sync: true,
        sync_frequency: 'hourly'
      }
    };

    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar connection:', error);
      return NextResponse.json({ error: 'Failed to create calendar connection' }, { status: 500 });
    }

    return NextResponse.json({ 
      connection, 
      message: 'Calendar connected successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}