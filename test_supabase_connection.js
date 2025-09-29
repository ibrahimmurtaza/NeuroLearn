require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key
    
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\nTesting basic connection...');
    const { data, error } = await supabase
      .from('quiz_documents')
      .select('id, title')
      .limit(1);
    
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    
    console.log('Connection successful!');
    console.log('Sample data:', data);
    
    // List all quizzes to see what's available
    console.log('\nListing all available quizzes...');
    const { data: allQuizzes, error: allQuizzesError } = await supabase
      .from('quiz_quizzes')
      .select('id, title, created_at')
      .limit(10);
    
    if (allQuizzesError) {
      console.error('Error fetching all quizzes:', allQuizzesError);
    } else {
      console.log('Available quizzes:', allQuizzes);
    }
    
    // Test specific quiz that exists in the database
    console.log('\nTesting specific quiz query for existing quiz...');
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
      .eq('id', '2b17c1ad-4968-4c66-a79b-98dfe9c776c8');
    
    console.log('Verifying quiz exists and connection is working properly...');
    
    if (quizError) {
      console.error('Quiz query error:', quizError);
      
      // Try without .single() to see if quiz exists
      console.log('\nTrying to find quiz without .single()...');
      const { data: allQuizzes, error: allError } = await supabase
        .from('quiz_quizzes')
        .select('id, title')
        .eq('id', '2b17c1ad-4968-4c66-a79b-98dfe9c776c8');
      
      if (allError) {
        console.error('All quizzes query error:', allError);
      } else {
        console.log('Quiz search result:', allQuizzes);
      }
      
      return;
    }
    
    console.log('Quiz query successful!');
    console.log('Quiz data:', quiz);
    if (quiz && quiz.length > 0) {
      console.log('Quiz:', {
        id: quiz[0].id,
        title: quiz[0].title,
        questionsCount: quiz[0].quiz_questions?.length
      });
    } else {
      console.log('No quiz found with that ID');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

testConnection();