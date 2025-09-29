import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/services/quizService';
import { QuizGenerationRequest } from '@/types/quiz';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Quiz Generation API Called ===');
    const body: QuizGenerationRequest = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.doc_ids || body.doc_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one document ID is required' },
        { status: 400 }
      );
    }

    if (!body.preferences) {
      return NextResponse.json(
        { error: 'Quiz preferences are required' },
        { status: 400 }
      );
    }

    // Set default preferences if not provided
    const preferences = {
      num_questions: 10,
      question_types: ['mcq'],
      difficulty_range: { min: 2, max: 4 },
      mode: 'untimed',
      ...body.preferences
    };

    const requestWithDefaults: QuizGenerationRequest = {
      ...body,
      preferences
    };

    // Generate quiz
    console.log('Calling quizService.generateQuiz with:', JSON.stringify(requestWithDefaults, null, 2));
    const result = await quizService.generateQuiz(requestWithDefaults);
    console.log('Quiz generation result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to generate quiz',
          details: result.metadata 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz_id: result.quiz_id,
      questions: result.questions,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('=== Quiz Generation API Error ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);
    
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