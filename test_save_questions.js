const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Test saving questions directly to database
async function testSaveQuestions() {
  try {
    console.log('Testing direct question saving...');
    
    // Initialize Supabase client
    const supabase = createClient(
      'https://cgryfltmvaplsrawoktj.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I'
    );
    
    // Create a test quiz first
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_quizzes')
      .insert({
        user_id: '22222222-2222-2222-2222-222222222222',
        creator_id: '22222222-2222-2222-2222-222222222222',
        title: 'Test Quiz for Question Saving',
        document_ids: ['33333333-3333-3333-3333-333333333333'],
        mode: 'practice',
        time_limit: 30,
        status: 'draft',
        settings: {
          shuffle_questions: true,
          shuffle_options: true,
          show_feedback: true,
          allow_review: true
        },
        metadata: {
          total_questions: 1,
          difficulty_distribution: {},
          estimated_duration: 30
        }
      })
      .select()
      .single();
      
    if (quizError) {
      console.error('Failed to create test quiz:', quizError);
      return;
    }
    
    console.log('Created test quiz:', quiz.id);
    
    // Create a test question (matching actual schema)
    const testQuestion = {
      id: uuidv4(),
      quiz_id: quiz.id,
      type: 'mcq',
      prompt: 'What is machine learning?',
      options: [
        'A type of artificial intelligence',
        'A programming language',
        'A database system',
        'A web framework'
      ],
      correct_option_index: 0,
      answer_text: 'A type of artificial intelligence',
      difficulty: 2,
      source_doc_ids: ['33333333-3333-3333-3333-333333333333'],
      generated_by: 'test',
      verified: true
      // Note: removed created_at (doesn't exist) and evidence (separate table)
    };
    
    console.log('Attempting to save question:', JSON.stringify(testQuestion, null, 2));
    
    // Try to save the question
    const { data: savedQuestion, error: saveError } = await supabase
      .from('quiz_questions')
      .insert(testQuestion)
      .select()
      .single();
      
    if (saveError) {
      console.error('Failed to save question:', saveError);
      console.error('Error details:', JSON.stringify(saveError, null, 2));
    } else {
      console.log('Successfully saved question:', savedQuestion.id);
    }
    
    // Check if question was saved
    const { data: questions, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id);
      
    console.log('Questions found in database:', questions?.length || 0);
    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSaveQuestions();