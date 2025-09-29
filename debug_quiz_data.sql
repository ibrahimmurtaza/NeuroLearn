-- Check quiz records and questions
SELECT 
    q.id as quiz_id,
    q.title,
    q.status,
    q.created_at,
    q.user_id,
    COUNT(qq.id) as question_count
FROM quiz_quizzes q
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
GROUP BY q.id, q.title, q.status, q.created_at, q.user_id
ORDER BY q.created_at DESC
LIMIT 10;

-- Check if there are any questions at all
SELECT COUNT(*) as total_questions FROM quiz_questions;

-- Check recent quiz questions with details
SELECT 
    qq.id,
    qq.quiz_id,
    qq.type,
    qq.prompt,
    qq.options,
    qq.correct_option_index,
    qq.answer_text,
    qq.difficulty,
    qq.verified,
    qq.updated_at
FROM quiz_questions qq
ORDER BY qq.updated_at DESC
LIMIT 5;