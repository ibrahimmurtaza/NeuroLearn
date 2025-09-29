-- Check if questions exist for the generated quiz
SELECT 
    qq.id,
    qq.quiz_id,
    qq.type,
    qq.prompt,
    qq.options,
    qq.correct_option_index,
    qq.difficulty,
    qq.verified,
    qq.updated_at
FROM quiz_questions qq
WHERE qq.quiz_id = 'b1683cc0-e3c1-4f9d-a005-d0819d765aa1'
ORDER BY qq.updated_at;

-- Also check the quiz record itself
SELECT 
    id,
    title,
    status,
    metadata,
    created_at
FROM quiz_quizzes
WHERE id = 'b1683cc0-e3c1-4f9d-a005-d0819d765aa1';

-- Check all questions in the database to see if any exist
SELECT 
    COUNT(*) as total_questions,
    quiz_id
FROM quiz_questions 
GROUP BY quiz_id
ORDER BY total_questions DESC
LIMIT 10;