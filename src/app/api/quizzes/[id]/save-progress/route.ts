import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;
    const body = await request.json();

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Save progress to database
    const { data, error } = await supabase
      .from('quiz_progress')
      .upsert({
        quiz_id: quizId,
        user_id: body.userId,
        answers: body.answers || {},
        current_question_index: body.currentQuestionIndex || 0,
        time_remaining: body.timeRemaining,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'quiz_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving quiz progress:', error);
      return NextResponse.json(
        { error: 'Failed to save progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Progress saved successfully',
      data
    });

  } catch (error) {
    console.error('Save progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}