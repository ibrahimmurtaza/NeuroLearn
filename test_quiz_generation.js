const { createClient } = require('@supabase/supabase-js');
const http = require('http');

// Test quiz generation API
async function testQuizGeneration() {
  try {
    console.log('=== Testing Quiz Generation API ===');
    
    // Initialize Supabase client
    const supabase = createClient(
      'https://cgryfltmvaplsrawoktj.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I'
    );
    
    // Clear any existing test questions
    console.log('Clearing existing test questions...');
    await supabase
      .from('quiz_questions')
      .delete()
      .like('id', 'q_%');
    
    // Call the quiz generation API
    const postData = JSON.stringify({
      user_id: '22222222-2222-2222-2222-222222222222',
      doc_ids: ['33333333-3333-3333-3333-333333333333'],
      preferences: {
        num_questions: 1,
        question_types: ['mcq'],
        difficulty_range: { min: 1, max: 5 },
        mode: 'practice',
        time_limit: 30
      }
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/quizzes/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const responseText = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        console.log('API Response Status:', res.statusCode);
        console.log('API Response Headers:', res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
    
    console.log('Raw API Response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed API Response:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('Failed to parse API response as JSON:', parseError.message);
      return;
    }
    
    if (!result.success) {
      console.error('API returned error:', result.error);
      return;
    }
    
    console.log('\n=== Checking if questions were saved ===');
    
    // Wait a moment for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if questions were saved to database
    const { data: questions, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', result.quiz_id);
      
    console.log('Questions in database:', questions?.length || 0);
    
    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
    }
    
    if (questions && questions.length > 0) {
      console.log('SUCCESS: Questions were saved to database!');
      console.log('First question:', JSON.stringify(questions[0], null, 2));
    } else {
      console.log('PROBLEM: No questions found in database!');
      
      // Check if quiz record exists
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_quizzes')
        .select('*')
        .eq('id', result.quiz_id)
        .single();
        
      if (quizError) {
        console.error('Error fetching quiz:', quizError);
      } else {
        console.log('Quiz record exists:', JSON.stringify(quiz, null, 2));
      }
    }
    
    // Check evidence table
    const { data: evidence, error: evidenceError } = await supabase
      .from('quiz_question_evidence')
      .select('*');
      
    console.log('Evidence records in database:', evidence?.length || 0);
    if (evidenceError) {
      console.error('Error fetching evidence:', evidenceError);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testQuizGeneration();