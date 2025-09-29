import { NextRequest, NextResponse } from 'next/server';
import { quizService } from '@/services/quizService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!body.topic || typeof body.topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate topic length
    if (body.topic.trim().length < 3) {
      return NextResponse.json(
        { error: 'Topic must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (body.topic.trim().length > 100) {
      return NextResponse.json(
        { error: 'Topic must be less than 100 characters' },
        { status: 400 }
      );
    }

    if (!body.preferences || typeof body.preferences !== 'object') {
      return NextResponse.json(
        { error: 'Preferences are required' },
        { status: 400 }
      );
    }

    // Validate preferences
    const { preferences } = body;
    
    if (!preferences.question_types || !Array.isArray(preferences.question_types) || preferences.question_types.length === 0) {
      return NextResponse.json(
        { error: 'At least one question type must be specified' },
        { status: 400 }
      );
    }

    if (!preferences.num_questions || preferences.num_questions < 1 || preferences.num_questions > 50) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Validate question types
    const validQuestionTypes = ['mcq', 'tf', 'short_answer', 'essay'];
    const invalidTypes = preferences.question_types.filter((type: string) => !validQuestionTypes.includes(type));
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Invalid question types: ${invalidTypes.join(', ')}. Valid types are: ${validQuestionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate additional topics if provided
    if (body.additional_topics && !Array.isArray(body.additional_topics)) {
      return NextResponse.json(
        { error: 'Additional topics must be an array' },
        { status: 400 }
      );
    }

    // Validate custom prompt if provided
    if (body.custom_prompt && typeof body.custom_prompt !== 'string') {
      return NextResponse.json(
        { error: 'Custom prompt must be a string' },
        { status: 400 }
      );
    }

    if (body.custom_prompt && body.custom_prompt.length > 500) {
      return NextResponse.json(
        { error: 'Custom prompt must be less than 500 characters' },
        { status: 400 }
      );
    }

    // Generate quiz using the service
    const result = await quizService.generateQuizFromTopic({
      user_id: body.user_id,
      topic: body.topic.trim(),
      additional_topics: body.additional_topics || [],
      preferences: body.preferences,
      custom_prompt: body.custom_prompt
    });

    return NextResponse.json({
      success: true,
      quiz: result.quiz
    });

  } catch (error) {
    console.error('Error in generate-from-topic API:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('Database')) {
        return NextResponse.json(
          { error: 'Database error. Please try again later.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate quizzes from topics.' },
    { status: 405 }
  );
}