import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/services/quizService';
import { QuizSubmissionRequest } from '@/types/quiz';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== QUIZ SUBMISSION START ===');
    const quizId = params.id;
    console.log('Quiz ID:', quizId);
    
    const body: Omit<QuizSubmissionRequest, 'quiz_id'> = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    if (!quizId) {
      console.log('ERROR: Quiz ID is missing');
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.user_id) {
      console.log('ERROR: User ID is missing');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.answers || body.answers.length === 0) {
      console.log('ERROR: Answers are missing or empty');
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      );
    }

    const submissionRequest: QuizSubmissionRequest = {
      quiz_id: quizId,
      user_id: body.user_id,
      answers: body.answers,
      time_taken: body.time_taken || 0
    };

    console.log('Submission request:', JSON.stringify(submissionRequest, null, 2));
    console.log('Calling quizService.submitQuiz...');

    // Submit quiz
    const result = await quizService.submitQuiz(submissionRequest);
    console.log('Quiz service result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('Quiz service returned failure:', result.error);
      return NextResponse.json(
        { 
          error: result.error || 'Failed to submit quiz',
          details: result
        },
        { status: 500 }
      );
    }

    console.log('Quiz submission successful, returning result');
    return NextResponse.json({
      success: true,
      attempt_id: result.attempt_id,
      score: result.score,
      percentage: result.percentage,
      feedback: result.feedback
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request body:', body);
    console.error('Quiz ID:', quizId);
    
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