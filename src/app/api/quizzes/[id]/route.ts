import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/services/quizService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quizId = params.id;

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Get quiz for taking (without answers)
    const quiz = await quizService.getQuizForTaking(quizId);

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz
    });

  } catch (error) {
    console.error('Quiz retrieval error:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}