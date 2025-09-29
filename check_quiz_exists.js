const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuizExists() {
  const quizId = '2b17c1ad-4968-4c66-a79b-98dfe9c776c8';
  
  console.log(`Checking if quiz with ID ${quizId} exists...`);
  
  try {
    // Check if quiz exists
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_quizzes')
      .select('*')
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      console.log('Quiz not found:', quizError.message);
      
      // Let's check what quizzes do exist
      const { data: allQuizzes, error: allQuizzesError } = await supabase
        .from('quiz_quizzes')
        .select('id, title, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allQuizzesError) {
        console.error('Error fetching all quizzes:', allQuizzesError);
      } else {
        console.log('\nExisting quizzes in database:');
        allQuizzes.forEach(q => {
          console.log(`- ID: ${q.id}, Title: ${q.title}, Status: ${q.status}, Created: ${q.created_at}`);
        });
      }
    } else {
      console.log('Quiz found:', quiz);
      
      // Check if it has questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);
      
      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      } else {
        console.log(`Quiz has ${questions.length} questions`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkQuizExists();