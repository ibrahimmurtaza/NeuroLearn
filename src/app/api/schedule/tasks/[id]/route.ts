import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        goals (
          id,
          title,
          category
        ),
        parent_task:parent_task_id(
          id,
          title
        ),
        subtasks:tasks!parent_task_id(
          id,
          title,
          status,
          priority,
          due_date,
          estimated_duration
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      title, 
      description, 
      goal_id, 
      parent_task_id,
      due_date, 
      priority, 
      status, 
      estimated_duration, 
      actual_duration,
      tags,
      completed_at
    } = body;

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be low, medium, or high' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be pending, in_progress, completed, or cancelled' },
        { status: 400 }
      );
    }

    // Validate goal_id if provided
    if (goal_id) {
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('id')
        .eq('id', goal_id)
        .eq('user_id', user.id)
        .single();

      if (goalError || !goal) {
        return NextResponse.json(
          { error: 'Invalid goal ID or goal does not belong to user' },
          { status: 400 }
        );
      }
    }

    // Validate parent_task_id if provided
    if (parent_task_id !== undefined) {
      if (parent_task_id === params.id) {
        return NextResponse.json(
          { error: 'Task cannot be its own parent' },
          { status: 400 }
        );
      }

      if (parent_task_id) {
        const { data: parentTask, error: parentError } = await supabase
          .from('tasks')
          .select('id, goal_id')
          .eq('id', parent_task_id)
          .eq('user_id', user.id)
          .single();

        if (parentError || !parentTask) {
          return NextResponse.json(
            { error: 'Invalid parent task ID or parent task does not belong to user' },
            { status: 400 }
          );
        }

        // Ensure parent task belongs to the same goal (if goal_id is being updated)
        if (goal_id && parentTask.goal_id !== goal_id) {
          return NextResponse.json(
            { error: 'Parent task must belong to the same goal' },
            { status: 400 }
          );
        }
      }
    }

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (goal_id !== undefined) updateData.goal_id = goal_id;
    if (parent_task_id !== undefined) updateData.parent_task_id = parent_task_id;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (actual_duration !== undefined) updateData.actual_duration = actual_duration;
    if (tags !== undefined) updateData.tags = tags;
    if (completed_at !== undefined) updateData.completed_at = completed_at;

    // Auto-set completed_at when status changes to completed
    if (status === 'completed' && !completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    // Clear completed_at when status changes from completed
    if (status && status !== 'completed' && completed_at === null) {
      updateData.completed_at = null;
    }

    // Update task
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select(`
        *,
        goals (
          id,
          title,
          category
        ),
        parent_task:parent_task_id(
          id,
          title
        ),
        subtasks:tasks!parent_task_id(
          id,
          title,
          status,
          priority,
          due_date
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // Update productivity patterns if task was completed
    if (status === 'completed' && actual_duration) {
      try {
        await supabase.rpc('update_productivity_patterns', {
          p_user_id: user.id,
          p_task_duration: actual_duration,
          p_completion_time: new Date().toISOString()
        });
      } catch (patternError) {
        console.warn('Failed to update productivity patterns:', patternError);
      }
    }

    return NextResponse.json({ 
      task, 
      message: 'Task updated successfully' 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if task exists and belongs to user
    const { data: existingTask, error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error checking task:', checkError);
      return NextResponse.json({ error: 'Failed to check task' }, { status: 500 });
    }

    // Delete task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}