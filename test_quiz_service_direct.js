require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('Testing QuizService submitQuiz method directly...');

// Initialize Supabase client exactly like QuizService does
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubmitQuizQuery() {
  try {
    console.log('\n=== Testing Quiz Query (same as submitQuiz method) ===');
    
    const quizId = '2b17c1ad-4968-4c66-a79b-98dfe9c776c8';
    console.log('Querying quiz:', quizId);
    
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          type,
          prompt,
          options,
          correct_option_index,
          answer_text,
          difficulty,
          quiz_question_evidence (
            chunk_id,
            start_pos,
            end_pos,
            text_snippet
          )
        )
      `)
      .eq('id', quizId)
      .single();

    console.log('Query result:', {
      hasQuiz: !!quiz,
      error: quizError,
      quizData: quiz ? {
        id: quiz.id,
        title: quiz.title,
        questionsLength: quiz.quiz_questions?.length
      } : null
    });

    if (quizError) {
      console.error('Quiz query error:', quizError);
      return;
    }

    if (!quiz) {
      console.error('Quiz not found');
      return;
    }

    console.log('Quiz found successfully!');
    console.log('Questions count:', quiz.quiz_questions?.length || 0);
    
    // Test a simple insert to quiz_attempts table
    console.log('\n=== Testing Quiz Attempts Insert ===');
    
    const testAttempt = {
      id: `test_attempt_${Date.now()}`,
      user_id: 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2',
      quiz_id: quizId,
      score: 85,
      started_at: new Date(Date.now() - 60000).toISOString(),
      completed_at: new Date().toISOString()
    };

    console.log('Attempting to insert test attempt:', testAttempt);

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert(testAttempt);

    if (attemptError) {
      console.error('Attempt insert error:', attemptError);
    } else {
      console.log('Test attempt inserted successfully!');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSubmitQuizQuery();