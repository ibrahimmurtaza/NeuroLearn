require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runSQL() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Inserting quiz data...');
    
    // Insert quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_quizzes')
      .upsert({
        id: '2b17c1ad-4968-4c66-a79b-98dfe9c776c8',
        title: 'Quiz - 9/27/2025',
        creator_id: 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2',
        user_id: 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2',
        document_ids: ['563225aa-dca0-45f7-b4f8-fc47afe805ba'],
        mode: 'practice',
        status: 'published',
        time_limit: null,
        difficulty_range: '1-5',
        settings: {
          allow_review: true,
          show_feedback: true,
          shuffle_options: true,
          shuffle_questions: true
        },
        metadata: {
          updated_at: '2025-09-27T07:49:15.845Z',
          total_questions: 10,
          estimated_duration: 20,
          difficulty_distribution: { '2': 5, '3': 2, '4': 3 }
        },
        created_at: '2025-09-27 07:48:51.096902+00'
      });
    
    if (quizError) {
      console.error('Error inserting quiz:', quizError);
      return;
    }
    
    console.log('Quiz inserted successfully');
    
    // Insert questions with proper UUIDs and correct type
    const questions = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        quiz_id: '2b17c1ad-4968-4c66-a79b-98dfe9c776c8',
        type: 'mcq',
        prompt: 'What is machine learning?',
        options: ['A subset of AI', 'A programming language', 'A database', 'A web framework'],
        correct_option_index: 0,
        answer_text: null,
        difficulty: 2
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        quiz_id: '2b17c1ad-4968-4c66-a79b-98dfe9c776c8',
        type: 'mcq',
        prompt: 'Which type of learning uses labeled data?',
        options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Deep learning'],
        correct_option_index: 0,
        answer_text: null,
        difficulty: 2
      }
    ];
    
    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .upsert(questions);
    
    if (questionsError) {
      console.error('Error inserting questions:', questionsError);
      return;
    }
    
    console.log('Questions inserted successfully');
    
    // Verify the data
    const { data: verifyData, error: verifyError } = await supabase
      .from('quiz_quizzes')
      .select(`
        id,
        title,
        quiz_questions (
          id,
          prompt
        )
      `)
      .eq('id', '2b17c1ad-4968-4c66-a79b-98dfe9c776c8');
    
    if (verifyError) {
      console.error('Error verifying data:', verifyError);
      return;
    }
    
    console.log('Verification result:', JSON.stringify(verifyData, null, 2));
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

runSQL();