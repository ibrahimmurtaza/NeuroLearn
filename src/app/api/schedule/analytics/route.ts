import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ANALYTICS_CONFIG, calculateProductivityScore } from '@/constants/analytics';
import { cookies } from 'next/headers';

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
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
    const type = searchParams.get('type') || 'overview'; // overview, patterns, goals, tasks

    // Calculate date range based on period
    let startDate: Date;
    const now = new Date();
    
    switch (period) {
      case ANALYTICS_CONFIG.TIME_PERIODS.THIRTY_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case ANALYTICS_CONFIG.TIME_PERIODS.NINETY_DAYS:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(now.getTime() - ANALYTICS_CONFIG.ANALYSIS_PERIODS.RECENT_DAYS * 24 * 60 * 60 * 1000);
    }

    const analytics: any = {};

    // Optimize database queries by running them in parallel
    const queries = [];

    if (type === 'overview' || type === 'tasks') {
      queries.push(
        supabase
          .from('tasks')
          .select('status, priority, completed_at, actual_duration, estimated_duration')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
      );
    }

    if (type === 'overview' || type === 'goals') {
      queries.push(
        supabase
          .from('goals')
          .select(`
            status, 
            priority, 
            created_at,
            tasks!inner(status)
          `)
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
      );
    }

    if (type === 'overview' || type === 'patterns') {
      queries.push(
        supabase
          .from('productivity_patterns')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: false })
      );
    }

    // Execute all queries in parallel
    const results = await Promise.allSettled(queries);
    let taskStats, goalStats, patterns;

    // Process results based on query order
    let resultIndex = 0;
    if (type === 'overview' || type === 'tasks') {
      const taskResult = results[resultIndex++];
      taskStats = taskResult.status === 'fulfilled' ? taskResult.value.data : null;
    }

    if (type === 'overview' || type === 'goals') {
      const goalResult = results[resultIndex++];
      goalStats = goalResult.status === 'fulfilled' ? goalResult.value.data : null;
    }

    if (type === 'overview' || type === 'patterns') {
      const patternResult = results[resultIndex++];
      patterns = patternResult.status === 'fulfilled' ? patternResult.value.data : null;
    }

    // Process task analytics
    if (taskStats !== undefined) {
      const completedTasks = taskStats?.filter(t => t.status === 'completed') || [];
      const totalTasks = taskStats?.length || 0;
      
      analytics.task_analytics = {
        total_tasks: totalTasks,
        completed_tasks: completedTasks.length,
        completion_rate: totalTasks > 0 ? (completedTasks.length / totalTasks * 100).toFixed(1) : '0',
        average_completion_time: completedTasks.length > 0 
          ? (completedTasks.reduce((sum, task) => sum + (task.actual_duration || 0), 0) / completedTasks.length).toFixed(1)
          : '0',
        priority_breakdown: {
          high: taskStats?.filter(t => t.priority === 'high').length || 0,
          medium: taskStats?.filter(t => t.priority === 'medium').length || 0,
          low: taskStats?.filter(t => t.priority === 'low').length || 0
        }
      };
    }

    // Process goal analytics
    if (goalStats !== undefined) {
      const activeGoals = goalStats?.filter(g => g.status === 'active') || [];
      const completedGoals = goalStats?.filter(g => g.status === 'completed') || [];
      
      analytics.goal_analytics = {
        total_goals: goalStats?.length || 0,
        active_goals: activeGoals.length,
        completed_goals: completedGoals.length,
        goal_completion_rate: goalStats?.length > 0 
          ? (completedGoals.length / goalStats.length * 100).toFixed(1) 
          : '0'
      };
    }

    // Process productivity patterns
    if (patterns !== undefined) {
      analytics.productivity_patterns = {
        daily_patterns: patterns || [],
        peak_hours: patterns?.length > 0 
          ? patterns.reduce((acc, p) => {
              const hourData = p.hourly_productivity || {};
              Object.entries(hourData).forEach(([hour, productivity]) => {
                acc[hour] = (acc[hour] || 0) + (productivity as number);
              });
              return acc;
            }, {} as Record<string, number>)
          : {},
        average_focus_time: patterns?.length > 0
          ? (patterns.reduce((sum, p) => sum + (p.focus_time || 0), 0) / patterns.length).toFixed(1)
          : '0'
      };
    }

    // Weekly progress for charts - optimize with single query
    if (type === 'overview') {
      const weekStart = new Date(now.getTime() - (ANALYTICS_CONFIG.ANALYSIS_PERIODS.WEEKLY_DAYS - 1) * 24 * 60 * 60 * 1000);
      weekStart.setHours(0, 0, 0, 0);
      
      const { data: weeklyTasks } = await supabase
        .from('tasks')
        .select('status, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', now.toISOString());

      // Group tasks by day
      const weeklyData = [];
      for (let i = ANALYTICS_CONFIG.ANALYSIS_PERIODS.WEEKLY_DAYS - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = weeklyTasks?.filter(task => {
          const taskDate = new Date(task.created_at).toISOString().split('T')[0];
          return taskDate === dateStr;
        }) || [];

        const completed = dayTasks.filter(t => t.status === 'completed').length;
        const total = dayTasks.length;
        
        weeklyData.push({
          date: dateStr,
          completed_tasks: completed,
          total_tasks: total,
          completion_rate: total > 0 ? (completed / total * 100).toFixed(1) : '0'
        });
      }
      
      analytics.weekly_progress = weeklyData;
    }

    // Calculate productivity score dynamically
    const totalTasks = analytics.task_analytics?.total_tasks || 0;
    const completedTasks = analytics.task_analytics?.completed_tasks || 0;
    const completionRate = parseFloat(analytics.task_analytics?.completion_rate || '0');
    const averageFocusTime = parseFloat(analytics.productivity_patterns?.average_focus_time || '0');
    
    const productivityScore = calculateProductivityScore(
      completionRate,
      averageFocusTime,
      totalTasks
    );

    // Format response to match frontend expectations
    const response = {
      overview: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        total_goals: analytics.goal_analytics?.total_goals || 0,
        active_goals: analytics.goal_analytics?.active_goals || 0,
        average_focus_time: averageFocusTime,
        productivity_score: productivityScore
      },
      patterns: {
        daily_productivity: analytics.productivity_patterns?.daily_patterns?.map((pattern: any) => ({
          day: pattern.date,
          productivity_score: pattern.productivity_score || 0,
          tasks_completed: pattern.tasks_completed || 0,
          focus_time: pattern.focus_time || 0
        })) || [],
        peak_hours: Object.entries(analytics.productivity_patterns?.peak_hours || {}).map(([hour, score]) => ({
          hour: parseInt(hour),
          productivity_score: score as number,
          task_count: 0 // Can be calculated if needed
        })),
        focus_sessions: analytics.productivity_patterns?.daily_patterns?.map((pattern: any) => ({
          date: pattern.date,
          duration: pattern.focus_time || 0,
          quality_score: pattern.productivity_score || 0
        })) || []
      },
      goals: [], // Will be populated if goal data is available
      tasks: {
        by_priority: [
          { priority: 'high', count: analytics.task_analytics?.priority_breakdown?.high || 0, completed: 0 },
          { priority: 'medium', count: analytics.task_analytics?.priority_breakdown?.medium || 0, completed: 0 },
          { priority: 'low', count: analytics.task_analytics?.priority_breakdown?.low || 0, completed: 0 }
        ],
        by_category: [], // Can be populated if category data is available
        completion_trend: []
      },
      weekly_progress: analytics.weekly_progress?.map((week: any) => ({
        week: week.date,
        goals_completed: 0,
        tasks_completed: week.completed_tasks,
        focus_hours: 0,
        productivity_score: parseFloat(week.completion_rate)
      })) || []
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}