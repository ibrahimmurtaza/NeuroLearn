import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { aiPlanGenerator, type GoalDetails } from '@/lib/services/aiPlanGenerator';

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
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: goals, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }

    return NextResponse.json({ goals });
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
    const { title, description, deadline, priority, category, availability } = body;

    // Validate required fields
    if (!title || !deadline) {
      return NextResponse.json(
        { error: 'Title and deadline are required' },
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

    // Create goal
    const goalData = {
      user_id: user.id,
      title,
      description,
      deadline,
      priority: priority || 'medium',
      category,
      metadata: {
        availability: availability || {},
        created_via: 'web_app'
      }
    };

    const { data: goal, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }

    // Generate AI-powered plan with subtasks and milestones
    try {
      const goalDetails: GoalDetails = {
        title,
        description,
        deadline,
        category,
        priority: priority || 'medium'
      };

      // Generate plan using AI
      const generatedPlan = await aiPlanGenerator.generatePlan(goalDetails);

      // Insert subtasks into database
      const { data: subtasks, error: subtaskError } = await supabase
        .rpc('insert_generated_subtasks', {
          p_goal_id: goal.id,
          p_subtasks: generatedPlan.subtasks
        });

      if (subtaskError) {
        console.warn('Error inserting subtasks:', subtaskError);
      }

      // Insert milestones into database
      const { data: milestones, error: milestoneError } = await supabase
        .rpc('insert_generated_milestones', {
          p_goal_id: goal.id,
          p_milestones: generatedPlan.milestones
        });

      if (milestoneError) {
        console.warn('Error inserting milestones:', milestoneError);
      }

      return NextResponse.json({ 
        goal, 
        subtasks: subtasks || [],
        milestones: milestones || [],
        plan: generatedPlan,
        message: 'Goal created successfully with AI-generated plan'
      });
    } catch (planError) {
      console.warn('AI plan generation failed:', planError);
      
      // Fallback: create basic subtask with due date
      try {
        // Calculate a reasonable due date for the fallback task
        const goalDeadline = new Date(deadline);
        const now = new Date();
        const totalDays = Math.ceil((goalDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const taskDueDate = new Date(now);
        taskDueDate.setDate(taskDueDate.getDate() + Math.min(Math.floor(totalDays * 0.3), 7)); // 30% of timeline or max 7 days

        const { data: fallbackSubtasks } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            goal_id: goal.id,
            title: `Research and planning for: ${title}`,
            description: 'Initial research and planning phase',
            priority: 'high',
            estimated_duration: 120,
            order_index: 1,
            due_date: taskDueDate.toISOString()
          })
          .select();

        return NextResponse.json({ 
          goal, 
          subtasks: fallbackSubtasks || [],
          milestones: [],
          message: 'Goal created successfully (using fallback plan)'
        });
      } catch (fallbackError) {
        console.error('Fallback plan creation failed:', fallbackError);
        return NextResponse.json({ 
          goal, 
          subtasks: [],
          milestones: [],
          message: 'Goal created successfully (plan generation skipped)'
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}