import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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
          console.log(`Supabase operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
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
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('OAuth Callback - Request received:', {
      hasCode: !!code,
      hasState: !!state,
      error,
      url: request.url
    });

    if (error) {
      console.error('OAuth Callback - OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/schedule/calendar?error=oauth_failed&details=${error}`, request.url)
      );
    }

    if (!code) {
      console.error('OAuth Callback - No authorization code received');
      return NextResponse.redirect(
        new URL('/schedule/calendar?error=no_code', request.url)
      );
    }

    // Validate Google OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    // Check if credentials are properly configured (not placeholder values)
    if (!clientId || !clientSecret || !redirectUri ||
        clientId.includes('your-google-client-id') ||
        clientSecret.includes('your-google-client-secret') ||
        clientId === 'your-google-client-id.apps.googleusercontent.com' ||
        clientSecret === 'your-google-client-secret') {
      
      console.error('OAuth Callback - Invalid OAuth credentials');
      return NextResponse.redirect(
        new URL('/schedule/calendar?error=oauth_not_configured', request.url)
      );
    }

    // Initialize OAuth2 client with validated credentials
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('OAuth Callback - Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token
    });

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Try to get user with retry mechanism
    let user = null;
    let sessionData = null;
    let authError = null;

    try {
      console.log('OAuth Callback - Attempting to get user with retry mechanism...');
      
      const authResult = await retrySupabaseOperation(async () => {
        return await supabase.auth.getUser();
      });
      
      user = authResult.data.user;
      authError = authResult.error;
      
      console.log('OAuth Callback - Auth check result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      });
      
    } catch (error: any) {
      console.error('OAuth Callback - Auth check failed after retries:', error.message);
      authError = error;
    }

    // If primary auth failed, try session fallback with retry
    if (!user) {
      try {
        console.log('OAuth Callback - Attempting session fallback with retry...');
        
        const sessionResult = await retrySupabaseOperation(async () => {
          return await supabase.auth.getSession();
        });
        
        sessionData = sessionResult.data;
        user = sessionData?.session?.user || null;
        
        console.log('OAuth Callback - Session fallback result:', {
          hasSession: !!sessionData?.session,
          sessionUser: sessionData?.session?.user?.id
        });
        
      } catch (error: any) {
        console.error('OAuth Callback - Session fallback failed after retries:', error.message);
      }
    }

    // Parse state to get user context if available
    let stateData = null;
    try {
      stateData = state ? JSON.parse(decodeURIComponent(state)) : null;
    } catch (e) {
      console.warn('OAuth Callback - Failed to parse state:', e);
    }

    // If we still don't have a user, try to use user ID from state as last resort
    if (!user && stateData?.userId) {
      console.log('OAuth Callback - Using user ID from state as fallback:', stateData.userId);
      user = { id: stateData.userId } as any; // Minimal user object for connection creation
    }

    // Final check - if no user found, redirect with detailed error
    if (!user) {
      console.error('OAuth Callback - No valid user found after all attempts');
      return NextResponse.redirect(
        new URL('/schedule/calendar?error=unauthorized&details=supabase_unavailable', request.url)
      );
    }

    console.log('OAuth Callback - Using user:', user.id);

    // Create calendar connection with retry mechanism
    try {
      const connectionResult = await retrySupabaseOperation(async () => {
        // Check for existing connection
        const { data: existingConnection } = await supabase
          .from('calendar_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .single();

        if (existingConnection) {
          // Update existing connection
          return await supabase
            .from('calendar_connections')
            .update({
              auth_tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
              },
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConnection.id)
            .select()
            .single();
        } else {
          // Create new connection
          return await supabase
            .from('calendar_connections')
            .insert({
              user_id: user.id,
              provider: 'google',
              external_calendar_id: 'primary',
              calendar_name: 'Google Calendar',
              auth_tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
              },
              is_active: true,
              sync_settings: {
                sync_tasks: true,
                sync_goals: false,
                auto_sync: true,
                sync_frequency: 'hourly'
              }
            })
            .select()
            .single();
        }
      });

      if (connectionResult.error) {
        console.error('OAuth Callback - Database operation failed:', connectionResult.error);
        return NextResponse.redirect(
          new URL('/schedule/calendar?error=callback_failed&details=db_error', request.url)
        );
      }

      console.log('OAuth Callback - Calendar connection created/updated successfully');
      return NextResponse.redirect(
        new URL('/schedule/calendar?success=connected', request.url)
      );

    } catch (error: any) {
      console.error('OAuth Callback - Failed to create/update calendar connection after retries:', error);
      return NextResponse.redirect(
        new URL('/schedule/calendar?error=callback_failed&details=connection_failed', request.url)
      );
    }

  } catch (error: any) {
    console.error('OAuth Callback - Unexpected error:', error);
    return NextResponse.redirect(
      new URL('/schedule/calendar?error=callback_failed&details=unexpected', request.url)
    );
  }
}