import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch quizzes for the user with questions
    const { data: quizzes, error } = await supabase
      .from('quiz_quizzes')
      .select(`
        *,
        quiz_questions(
          id,
          type,
          prompt,
          options,
          correct_option_index,
          answer_text,
          difficulty,
          verified,
          updated_at
        ),
        quiz_attempts(
          id,
          score,
          completed_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quizzes' },
        { status: 500 }
      );
    }

    // Process quizzes to include stats
    const quizzesWithStats = quizzes?.map(quiz => {
      const attempts = quiz.quiz_attempts || [];
      const attemptCount = attempts.length;
      const validScores = attempts.filter(attempt => attempt.score !== null).map(attempt => attempt.score);
      const bestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
      const averageScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
      const lastAttempt = attempts.length > 0 && attempts[0].completed_at ? attempts[0].completed_at : null;

      return {
        ...quiz,
        questions: quiz.quiz_questions || [], // Map quiz_questions to questions
        attemptCount,
        bestScore,
        averageScore: Math.round(averageScore * 100) / 100,
        lastAttempt,
        quiz_attempts: undefined, // Remove the nested attempts from response
        quiz_questions: undefined // Remove the nested questions from response
      };
    }) || [];

    return NextResponse.json({
      quizzes: quizzesWithStats,
      total: quizzesWithStats.length
    });

  } catch (error) {
    console.error('Error in GET /api/quizzes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}