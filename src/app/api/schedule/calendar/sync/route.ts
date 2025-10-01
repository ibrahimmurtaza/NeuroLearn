import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { connection_id, sync_type = 'full' } = body;

    // Validate required fields
    if (!connection_id) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Validate sync_type
    if (!['full', 'tasks_only', 'events_only'].includes(sync_type)) {
      return NextResponse.json(
        { error: 'Sync type must be full, tasks_only, or events_only' },
        { status: 400 }
      );
    }

    // Get calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    if (!connection.is_active) {
      return NextResponse.json(
        { error: 'Calendar connection is not active' },
        { status: 400 }
      );
    }

    let eventsProcessed = 0;
    let tasksCreated = 0;
    let errors: string[] = [];

    try {
      // Implement Google Calendar sync
      if (connection.provider === 'google') {
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
          
          return NextResponse.json({
            error: 'Google OAuth credentials not configured',
            message: 'Please configure your Google OAuth credentials in the environment variables. Visit the Google Cloud Console to create OAuth 2.0 credentials.',
            details: {
              required_env_vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
              setup_url: 'https://console.cloud.google.com/apis/credentials'
            }
          }, { status: 400 });
        }

        // Initialize OAuth2 client with proper credentials
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
        );
        
        oauth2Client.setCredentials({
          access_token: connection.auth_tokens?.access_token,
          refresh_token: connection.auth_tokens?.refresh_token,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Fetch events from the last 30 days and next 30 days
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30);

        console.log('Fetching Google Calendar events...');
        
        // Handle token refresh if needed
        try {
          const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
          });
        } catch (authError: any) {
          // If token is expired, try to refresh
          if (authError.code === 401 || authError.message?.includes('invalid_token')) {
            console.log('Access token expired, attempting to refresh...');
            
            if (!connection.auth_tokens?.refresh_token) {
              throw new Error('No refresh token available. Please reconnect your calendar.');
            }
            
            try {
              const { credentials } = await oauth2Client.refreshAccessToken();
              oauth2Client.setCredentials(credentials);
              
              // Update the connection with new tokens
              await supabase
                .from('calendar_connections')
                .update({
                  auth_tokens: {
                    ...connection.auth_tokens,
                    access_token: credentials.access_token,
                    expiry_date: credentials.expiry_date
                  }
                })
                .eq('id', connection_id);
              
              // Retry the request with refreshed token
              const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime',
              });
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              throw new Error('Authentication failed. Please reconnect your Google Calendar.');
            }
          } else {
            throw authError;
          }
        }
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items || [];
        eventsProcessed = events.length;
        console.log(`Found ${eventsProcessed} events to process`);

        // Process each event and create tasks
        for (const event of events) {
          try {
            // Skip events without a title or all-day events without specific times
            if (!event.summary || (!event.start?.dateTime && !event.start?.date)) {
              continue;
            }

            // Check if task already exists for this event
            const { data: existingTask } = await supabase
              .from('tasks')
              .select('id')
              .eq('user_id', user.id)
              .eq('title', event.summary)
              .single();

            if (existingTask) {
              console.log(`Task already exists for event: ${event.summary}`);
              continue;
            }

            // Determine due date
            let dueDate: string | null = null;
            if (event.start?.dateTime) {
              dueDate = event.start.dateTime;
            } else if (event.start?.date) {
              // For all-day events, set due date to the start of the day
              dueDate = new Date(event.start.date).toISOString();
            }

            // Calculate estimated duration
            let estimatedDuration = 60; // Default 1 hour
            if (event.start?.dateTime && event.end?.dateTime) {
              const startTime = new Date(event.start.dateTime);
              const endTime = new Date(event.end.dateTime);
              estimatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
            }

            // Create task from calendar event
            const taskData = {
              user_id: user.id,
              title: event.summary,
              description: event.description || `Synced from Google Calendar: ${event.summary}`,
              due_date: dueDate,
              priority: 'medium' as const,
              status: 'pending' as const,
              estimated_duration: estimatedDuration,
              metadata: {
                source: 'google_calendar',
                event_id: event.id,
                calendar_id: connection.external_calendar_id,
                sync_date: new Date().toISOString(),
                event_link: event.htmlLink,
                location: event.location,
              }
            };

            const { data: newTask, error: taskError } = await supabase
              .from('tasks')
              .insert(taskData)
              .select()
              .single();

            if (taskError) {
              console.error('Error creating task:', taskError);
              errors.push(`Failed to create task for event "${event.summary}": ${taskError.message}`);
            } else {
              tasksCreated++;
              console.log(`Created task: ${newTask.title}`);
            }

          } catch (eventError) {
            console.error('Error processing event:', eventError);
            errors.push(`Failed to process event "${event.summary}": ${eventError}`);
          }
        }

      } else {
        // For other providers (Outlook, etc.), add implementation here
        errors.push(`Sync not yet implemented for provider: ${connection.provider}`);
      }

    } catch (syncError: any) {
      console.error('Calendar sync error:', syncError);
      
      // Handle specific error types
      if (syncError.message?.includes('Authentication failed') || 
          syncError.message?.includes('Please reconnect')) {
        // Update connection status to indicate auth issues
        await supabase
          .from('calendar_connections')
          .update({ 
            is_active: false,
            sync_errors: [`Authentication error: ${syncError.message}`]
          })
          .eq('id', connection_id);
        
        return NextResponse.json({ 
          error: syncError.message,
          requires_reconnection: true 
        }, { status: 401 });
      }
      
      errors.push(`Calendar sync failed: ${syncError.message || syncError}`);
    }
    
    const syncResult = {
      connection_id,
      sync_type,
      provider: connection.provider,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      synced_at: new Date().toISOString(),
      events_synced: eventsProcessed,
      tasks_synced: tasksCreated,
      errors
    };

    // Update last sync time
    await supabase
      .from('calendar_connections')
      .update({ 
        last_sync: new Date().toISOString(),
        sync_errors: errors.length > 0 ? errors : null
      })
      .eq('id', connection_id)
      .eq('user_id', user.id);

    return NextResponse.json({ 
      sync_result: syncResult,
      message: `Calendar sync completed. ${tasksCreated} tasks created from ${eventsProcessed} events.`
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options);
          },
        },
      }
    );
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get calendar connection with sync status
    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    // Get recent tasks that might be synced
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, status, created_at, updated_at')
      .eq('user_id', user.id)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('updated_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ 
      connection,
      recent_tasks: recentTasks || [],
      sync_status: {
        last_sync: connection.last_sync,
        is_active: connection.is_active,
        sync_settings: connection.sync_settings
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}