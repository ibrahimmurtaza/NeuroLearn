import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/services/quizService';
import { QuizFlagRequest } from '@/types/quiz';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;
    const body: Omit<QuizFlagRequest, 'quiz_id'> = await request.json();

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.question_id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (!body.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'Flag category is required' },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { error: 'Flag reason is required' },
        { status: 400 }
      );
    }

    const flagRequest: QuizFlagRequest = {
      question_id: body.question_id,
      user_id: body.user_id,
      category: body.category,
      reason: body.reason,
      description: body.description || ''
    };

    // Flag question
    const result = await quizService.flagQuestion(flagRequest);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to flag question',
          message: result.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flag_id: result.flag_id,
      message: result.message
    });

  } catch (error) {
    console.error('Question flagging error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}