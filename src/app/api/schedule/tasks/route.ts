import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { aiPlanGenerator } from '@/lib/services/aiPlanGenerator';
import type { TaskDetails } from '@/lib/services/aiPlanGenerator';
import type { TaskStatus, TaskPriority, TaskCategory } from '@/types/schedule';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const goalId = searchParams.get('goal_id');
    const parentTaskId = searchParams.get('parent_task_id');
    const includeSubtasks = searchParams.get('include_subtasks') !== 'false';
    const rootTasksOnly = searchParams.get('root_tasks_only') === 'true';
    const tags = searchParams.get('tags');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query with subtask support
    let query = supabase
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
          due_date
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (goalId) {
      query = query.eq('goal_id', goalId);
    }
    if (parentTaskId) {
      query = query.eq('parent_task_id', parentTaskId);
    }
    if (rootTasksOnly) {
      query = query.is('parent_task_id', null);
    }
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query = query.contains('tags', tagArray);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      estimated_duration, 
      tags,
      generate_ai_subtasks = false,
      category
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate priority
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be low, medium, or high' },
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

      // If both goal_id and parent_task_id are provided, ensure they match
      if (goal_id && parentTask.goal_id !== goal_id) {
        return NextResponse.json(
          { error: 'Parent task must belong to the same goal' },
          { status: 400 }
        );
      }

      // If only parent_task_id is provided, inherit goal_id from parent
      if (!goal_id) {
        body.goal_id = parentTask.goal_id;
      }
    }

    // Create task
    const taskData = {
      user_id: user.id,
      title,
      description,
      goal_id: goal_id || body.goal_id,
      parent_task_id,
      due_date,
      priority: priority || 'medium',
      estimated_duration,
      tags: tags || [],
      metadata: {
        created_via: 'web_app'
      }
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(taskData)
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
        )
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    // Generate AI subtasks if requested and this is not already a subtask
    if (generate_ai_subtasks && !parent_task_id) {
      try {
        const taskDetails: TaskDetails = {
          title,
          description: description || '',
          category: category || 'general',
          priority: priority || 'medium',
          estimated_duration: estimated_duration || 60,
          goal_context: task.goals?.title || ''
        };

        const generatedResult = await aiPlanGenerator.generateDetailedSubtasks(taskDetails);
        
        if (generatedResult.subtasks.length > 0) {
          // Insert generated subtasks with detailed information
          const subtasksToInsert = generatedResult.subtasks.map((subtask, index) => ({
            title: subtask.title,
            description: subtask.description,
            goal_id: task.goal_id,
            parent_task_id: task.id,
            priority: subtask.priority,
            estimated_duration: subtask.estimated_duration,
            tags: [],
            user_id: user.id,
            metadata: {
              created_via: 'ai_generation',
              step_by_step_guide: subtask.step_by_step_guide,
              completion_criteria: subtask.completion_criteria,
              tips_and_warnings: subtask.tips_and_warnings,
              required_resources: subtask.required_resources,
              order_index: subtask.order_index,
              ai_generated: true,
              complexity_score: generatedResult.complexity_score,
              recommended_approach: generatedResult.recommended_approach
            }
          }));

          const { data: createdSubtasks, error: subtaskError } = await supabase
            .from('tasks')
            .insert(subtasksToInsert)
            .select();

          if (subtaskError) {
            console.error('Error creating AI subtasks:', subtaskError);
            // Don't fail the main task creation, just log the error
          } else {
            // Update the task object to include the new subtasks
            task.subtasks = createdSubtasks || [];
          }
        }
      } catch (aiError) {
        console.error('Error generating AI subtasks:', aiError);
        // Don't fail the main task creation, just log the error
      }
    }

    return NextResponse.json({ 
      task, 
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}