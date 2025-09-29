import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Calculate comprehensive statistics from database
    const stats = await calculateUserStats(userId);
    const recentAttempts = await getRecentAttempts(userId);
    const performanceByDifficulty = await getPerformanceByDifficulty(userId);
    const performanceByMode = await getPerformanceByMode(userId);
    const achievements = await calculateAchievements(userId, stats);

    return NextResponse.json({
      success: true,
      stats,
      recentAttempts,
      performanceByDifficulty,
      performanceByMode,
      achievements
    });

  } catch (error) {
    console.error('User stats retrieval error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function calculateUserStats(userId: string) {
  // Get all completed attempts with quiz data
  const { data: attempts, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      score,
      started_at,
      completed_at,
      quiz_id,
      quiz_quizzes(id, title, time_limit)
    `)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (attemptsError) {
    console.error('Attempts query error:', attemptsError);
    throw new Error(`Failed to get attempts: ${attemptsError.message}`);
  }

  // Get attempt answers by joining through attempt_id
  const attemptIds = attempts?.map(a => a.id) || [];
  let answers = [];
  
  if (attemptIds.length > 0) {
    const { data: answersData, error: answersError } = await supabase
      .from('quiz_attempt_answers')
      .select('attempt_id, is_correct, time_taken_ms')
      .in('attempt_id', attemptIds);

    if (answersError) {
      console.error('Answers query error:', answersError);
      // Don't throw error, just log it and continue with empty answers
      answers = [];
    } else {
      answers = answersData || [];
    }
  }

  const totalAttempts = attempts?.length || 0;
  const totalQuizzes = new Set(attempts?.map(a => a.quiz_id)).size;
  const scores = attempts?.map(a => a.score).filter(s => s !== null) || [];
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  
  // Calculate total time spent
  const totalTimeSpent = attempts?.reduce((total, attempt) => {
    if (attempt.started_at && attempt.completed_at) {
      const timeSpent = new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime();
      return total + Math.round(timeSpent / (1000 * 60)); // Convert to minutes
    }
    return total;
  }, 0) || 0;

  // Calculate streak days
  const streakDays = calculateStreakDays(attempts || []);

  // Calculate completion rate (completed vs started)
  const { data: allAttempts } = await supabase
    .from('quiz_attempts')
    .select('completed_at')
    .eq('user_id', userId);
  
  const totalStarted = allAttempts?.length || 0;
  const completionRate = totalStarted > 0 ? Math.round((totalAttempts / totalStarted) * 100) : 0;

  // Calculate improvement rate (last 5 vs first 5 attempts)
  const improvementRate = calculateImprovementRate(attempts || []);

  // Calculate correct answers
  const totalCorrectAnswers = answers?.filter(a => a.is_correct).length || 0;
  const totalQuestions = answers?.length || 0;

  const lastAttemptDate = attempts?.[0]?.completed_at || new Date().toISOString();

  return {
    totalQuizzes,
    totalAttempts,
    averageScore,
    bestScore,
    totalTimeSpent,
    streakDays,
    completionRate,
    improvementRate,
    lastAttemptDate,
    totalCorrectAnswers,
    totalQuestions
  };
}

async function getRecentAttempts(userId: string) {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      score,
      started_at,
      completed_at,
      quiz_quizzes(id, title, time_limit, difficulty_range)
    `)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Recent attempts query error:', error);
    throw new Error(`Failed to get recent attempts: ${error.message}`);
  }

  return attempts?.map(attempt => {
    const timeSpent = attempt.started_at && attempt.completed_at 
      ? Math.round((new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60))
      : 0;
    
    const quizData = attempt.quiz_quizzes;
    const difficulty = quizData ? parseDifficultyRange(quizData.difficulty_range) : 'medium';
    const mode = quizData?.time_limit ? 'timed' : 'practice';

    return {
      id: attempt.id,
      quizTitle: quizData?.title || 'Unknown Quiz',
      score: attempt.score || 0,
      percentage: attempt.score || 0,
      completedAt: attempt.completed_at,
      timeSpent,
      difficulty,
      mode
    };
  }) || [];
}

async function getPerformanceByDifficulty(userId: string) {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select(`
      score,
      quiz_quizzes(difficulty_range)
    `)
    .eq('user_id', userId)
    .not('completed_at', 'is', null);

  if (error) {
    console.error('Performance by difficulty query error:', error);
    throw new Error(`Failed to get performance by difficulty: ${error.message}`);
  }

  const difficultyStats = {
    easy: { totalAttempts: 0, totalScore: 0, averageScore: 0 },
    medium: { totalAttempts: 0, totalScore: 0, averageScore: 0 },
    hard: { totalAttempts: 0, totalScore: 0, averageScore: 0 }
  };

  attempts?.forEach(attempt => {
    const quizData = attempt.quiz_quizzes;
    const difficulty = quizData ? parseDifficultyRange(quizData.difficulty_range) : 'medium';
    const score = attempt.score || 0;
    
    if (difficultyStats[difficulty as keyof typeof difficultyStats]) {
      difficultyStats[difficulty as keyof typeof difficultyStats].totalAttempts++;
      difficultyStats[difficulty as keyof typeof difficultyStats].totalScore += score;
    }
  });

  // Calculate averages
  Object.keys(difficultyStats).forEach(key => {
    const stats = difficultyStats[key as keyof typeof difficultyStats];
    stats.averageScore = stats.totalAttempts > 0 
      ? Math.round(stats.totalScore / stats.totalAttempts) 
      : 0;
  });

  return difficultyStats;
}

async function getPerformanceByMode(userId: string) {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select(`
      score,
      quiz_quizzes(time_limit)
    `)
    .eq('user_id', userId)
    .not('completed_at', 'is', null);

  if (error) {
    console.error('Performance by mode query error:', error);
    throw new Error(`Failed to get performance by mode: ${error.message}`);
  }

  const modeStats = {
    practice: { totalAttempts: 0, totalScore: 0, averageScore: 0 },
    timed: { totalAttempts: 0, totalScore: 0, averageScore: 0 },
    assessment: { totalAttempts: 0, totalScore: 0, averageScore: 0 }
  };

  attempts?.forEach(attempt => {
    const quizData = attempt.quiz_quizzes;
    const mode = quizData?.time_limit ? 'timed' : 'practice';
    const score = attempt.score || 0;
    
    modeStats[mode].totalAttempts++;
    modeStats[mode].totalScore += score;
  });

  // Calculate averages
  Object.keys(modeStats).forEach(key => {
    const stats = modeStats[key as keyof typeof modeStats];
    stats.averageScore = stats.totalAttempts > 0 
      ? Math.round(stats.totalScore / stats.totalAttempts) 
      : 0;
  });

  return modeStats;
}

async function calculateAchievements(userId: string, stats: any) {
  const achievements = [];

  // First Quiz Achievement
  if (stats.totalAttempts >= 1) {
    achievements.push({
      id: 'first_quiz',
      title: 'First Steps',
      description: 'Completed your first quiz',
      icon: '🎯',
      unlockedAt: stats.lastAttemptDate,
      category: 'milestone'
    });
  }

  // Perfect Score Achievement
  if (stats.bestScore === 100) {
    achievements.push({
      id: 'perfect_score',
      title: 'Perfect Score',
      description: 'Achieved 100% on a quiz',
      icon: '💯',
      unlockedAt: stats.lastAttemptDate,
      category: 'performance'
    });
  }

  // Quiz Master Achievement
  if (stats.totalAttempts >= 10) {
    achievements.push({
      id: 'quiz_master',
      title: 'Quiz Master',
      description: 'Completed 10 quizzes',
      icon: '👑',
      unlockedAt: stats.lastAttemptDate,
      category: 'milestone'
    });
  }

  // High Achiever
  if (stats.averageScore >= 80) {
    achievements.push({
      id: 'high_achiever',
      title: 'High Achiever',
      description: 'Maintained 80%+ average score',
      icon: '⭐',
      unlockedAt: stats.lastAttemptDate,
      category: 'performance'
    });
  }

  // Streak Achievement
  if (stats.streakDays >= 7) {
    achievements.push({
      id: 'week_streak',
      title: 'Week Warrior',
      description: 'Completed quizzes for 7 consecutive days',
      icon: '🔥',
      unlockedAt: stats.lastAttemptDate,
      category: 'consistency'
    });
  }

  return achievements;
}

// Helper functions
function calculateStreakDays(attempts: any[]): number {
  if (!attempts || attempts.length === 0) return 0;

  const dates = attempts
    .map(a => new Date(a.completed_at).toDateString())
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date().toDateString();
  let currentDate = new Date();

  for (const dateStr of dates) {
    const attemptDate = new Date(dateStr);
    const daysDiff = Math.floor((currentDate.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === streak) {
      streak++;
      currentDate = attemptDate;
    } else {
      break;
    }
  }

  return streak;
}

function calculateImprovementRate(attempts: any[]): number {
  if (attempts.length < 2) return 0;

  const scores = attempts.map(a => a.score).filter(s => s !== null);
  if (scores.length < 2) return 0;

  const recentScores = scores.slice(0, Math.min(5, scores.length));
  const oldScores = scores.slice(-Math.min(5, scores.length));

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;

  return Math.round(((recentAvg - oldAvg) / oldAvg) * 100);
}

function parseDifficultyRange(difficultyRange: string): string {
  if (!difficultyRange) return 'medium';
  
  const range = difficultyRange.split('-').map(Number);
  const avgDifficulty = (range[0] + range[1]) / 2;
  
  if (avgDifficulty <= 2) return 'easy';
  if (avgDifficulty >= 4) return 'hard';
  return 'medium';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}