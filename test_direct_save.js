const { createClient } = require('@supabase/supabase-js');

// Test direct saveQuestionsToDatabase method
async function testDirectSave() {
  try {
    console.log('=== Testing Direct Save Method ===');
    
    // Initialize Supabase client
    const supabase = createClient(
      'https://cgryfltmvaplsrawoktj.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I'
    );
    
    // Create a test quiz first
    console.log('Creating test quiz...');
    const testQuizId = '12345678-1234-1234-1234-123456789012';
    const { data: quiz, error: quizError } = await supabase
      .from('quiz_quizzes')
      .insert({
        id: testQuizId,
        user_id: '22222222-2222-2222-2222-222222222222',
        creator_id: '22222222-2222-2222-2222-222222222222',
        title: 'Test Quiz for Direct Save',
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
      console.error('Error creating test quiz:', quizError);
      return;
    }
    
    console.log('Test quiz created:', quiz.id);
    
    // Create test question data matching the expected structure
    const testQuestion = {
      id: 'q_direct_test_' + Date.now(),
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
      answer_text: null,
      difficulty: 1,
      source_doc_ids: ['33333333-3333-3333-3333-333333333333'],
      generated_by: 'gpt-3.5-turbo',
      verified: true,
      verification_reason: null,
      evidence: [
        {
          chunk_id: '55555555-5555-5555-5555-555555555555',
          start: 0,
          end: 100,
          text_snippet: 'Machine learning is a subset of artificial intelligence',
          relevance_score: 0.9
        }
      ],
      metadata: {
        generation_time: Date.now(),
        confidence_score: 0.8
      }
    };
    
    console.log('Test question will be created with auto-generated UUID');
    
    // Try to save the question directly using Supabase client (let database generate UUID)
    console.log('\n=== Testing Direct Supabase Insert ===');
    
    const questionToInsert = {
      quiz_id: testQuestion.quiz_id,
      type: testQuestion.type,
      prompt: testQuestion.prompt,
      options: testQuestion.options,
      correct_option_index: testQuestion.correct_option_index,
      answer_text: testQuestion.answer_text,
      difficulty: testQuestion.difficulty,
      source_doc_ids: testQuestion.source_doc_ids,
      generated_by: testQuestion.generated_by,
      verified: testQuestion.verified,
      verification_reason: testQuestion.verification_reason
    };
    
    const { data: insertData, error: directInsertError } = await supabase
      .from('quiz_questions')
      .insert([questionToInsert])
      .select();
      
    if (directInsertError) {
      console.error('Direct insert error:', directInsertError);
    } else {
      console.log('SUCCESS: Direct insert worked!');
      if (insertData && insertData.length > 0) {
        // Update testQuestion with the actual generated ID
        testQuestion.id = insertData[0].id;
      }
    }
    
    // Check if question was saved
    if (insertData && insertData.length > 0) {
      const actualQuestionId = insertData[0].id;
      const { data: savedQuestion, error: fetchError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('id', actualQuestionId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching saved question:', fetchError);
      } else {
        console.log('Saved question found:', savedQuestion ? 'YES' : 'NO');
        if (savedQuestion) {
          console.log('Saved question data:', JSON.stringify(savedQuestion, null, 2));
        }
      }
    }
    
    // Try to save evidence (only if question was inserted successfully)
    console.log('\n=== Testing Evidence Save ===');
    
    if (insertData && insertData.length > 0) {
      for (const evidence of testQuestion.evidence) {
        const { error: evidenceError } = await supabase
           .from('quiz_question_evidence')
           .insert({
             question_id: testQuestion.id,
             chunk_id: evidence.chunk_id,
             start_pos: evidence.start,
             end_pos: evidence.end,
             text_snippet: evidence.text_snippet
           });

        if (evidenceError) {
          console.error('Evidence save error:', evidenceError);
        } else {
          console.log('Evidence saved successfully');
        }
      }
    } else {
      console.log('Skipping evidence test - question insert failed');
    }
    
    // Clean up
    console.log('\n=== Cleaning Up ===');
    if (insertData && insertData.length > 0) {
      const actualQuestionId = insertData[0].id;
      await supabase.from('quiz_question_evidence').delete().eq('question_id', actualQuestionId);
      await supabase.from('quiz_questions').delete().eq('id', actualQuestionId);
    }
    await supabase.from('quiz_quizzes').delete().eq('id', quiz.id);
    console.log('Cleanup completed');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testDirectSave();