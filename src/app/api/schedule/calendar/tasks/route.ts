import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
          console.log(`Tasks API - Supabase operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
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
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includeCompleted = searchParams.get('include_completed') !== 'false';

    // Build optimized query with minimal data selection
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        estimated_duration,
        goals!inner (
          id,
          title,
          category
        )
      `)
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    // Apply date range filter if provided
    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    // Filter out completed tasks if requested
    if (!includeCompleted) {
      query = query.neq('status', 'completed');
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Calendar tasks API error:', error);
      return NextResponse.json({ error: 'Failed to fetch calendar tasks' }, { status: 500 });
    }

    // Format tasks for calendar display with optimized processing
    const calendarEvents = tasks?.map(task => {
      const startTime = new Date(task.due_date);
      const endTime = task.estimated_duration 
        ? new Date(startTime.getTime() + task.estimated_duration * 60000)
        : new Date(startTime.getTime() + 60 * 60000); // Default 1 hour

      return {
        id: task.id,
        title: task.title,
        start: startTime,
        end: endTime,
        allDay: false,
        resource: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          estimatedDuration: task.estimated_duration,
          goal: task.goals ? {
            id: task.goals.id,
            title: task.goals.title,
            category: task.goals.category
          } : null
        }
      };
    }) || [];

    return NextResponse.json({ 
      events: calendarEvents,
      total: calendarEvents.length
    });
  } catch (error) {
    console.error('Calendar tasks API unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}