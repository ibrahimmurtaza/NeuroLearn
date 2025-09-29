const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugQuizStructure() {
  const quizId = '2b17c1ad-4968-4c66-a79b-98dfe9c776c8';
  
  console.log(`Debugging quiz structure for ID ${quizId}...`);
  
  try {
    // Get quiz and questions exactly as the submitQuiz method does
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

    if (quizError || !quiz) {
      console.error('Quiz error:', quizError);
      return;
    }

    console.log('Quiz structure:');
    console.log('- Quiz ID:', quiz.id);
    console.log('- Quiz title:', quiz.title);
    console.log('- Questions count:', quiz.quiz_questions?.length || 0);
    
    if (quiz.quiz_questions && quiz.quiz_questions.length > 0) {
      console.log('\nFirst question structure:');
      const firstQuestion = quiz.quiz_questions[0];
      console.log('- Question ID:', firstQuestion.id);
      console.log('- Question type:', firstQuestion.type);
      console.log('- Has prompt:', !!firstQuestion.prompt);
      console.log('- Has options:', !!firstQuestion.options);
      console.log('- Correct option index:', firstQuestion.correct_option_index);
      console.log('- Has answer_text:', !!firstQuestion.answer_text);
      console.log('- Answer text value:', firstQuestion.answer_text);
      console.log('- Evidence count:', firstQuestion.quiz_question_evidence?.length || 0);
      
      console.log('\nFull first question:');
      console.log(JSON.stringify(firstQuestion, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugQuizStructure();