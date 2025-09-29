-- Insert the quiz that should exist in the database
INSERT INTO "public"."quiz_quizzes" ("id", "title", "creator_id", "user_id", "document_ids", "mode", "status", "time_limit", "difficulty_range", "settings", "metadata", "created_at") VALUES 
('2b17c1ad-4968-4c66-a79b-98dfe9c776c8', 'Quiz - 9/27/2025', 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2', 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2', '{"563225aa-dca0-45f7-b4f8-fc47afe805ba"}', 'practice', 'published', null, '1-5', '{"allow_review": true, "show_feedback": true, "shuffle_options": true, "shuffle_questions": true}', '{"updated_at": "2025-09-27T07:49:15.845Z", "total_questions": 10, "estimated_duration": 20, "difficulty_distribution": {"2": 5, "3": 2, "4": 3}}', '2025-09-27 07:48:51.096902+00')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    creator_id = EXCLUDED.creator_id,
    user_id = EXCLUDED.user_id,
    document_ids = EXCLUDED.document_ids,
    mode = EXCLUDED.mode,
    status = EXCLUDED.status,
    time_limit = EXCLUDED.time_limit,
    difficulty_range = EXCLUDED.difficulty_range,
    settings = EXCLUDED.settings,
    metadata = EXCLUDED.metadata,
    created_at = EXCLUDED.created_at;

-- Insert some test questions for this quiz
INSERT INTO "public"."quiz_questions" ("id", "quiz_id", "type", "prompt", "options", "correct_option_index", "answer_text", "difficulty", "created_at") VALUES
('q1-2b17c1ad-4968-4c66-a79b-98dfe9c776c8', '2b17c1ad-4968-4c66-a79b-98dfe9c776c8', 'multiple_choice', 'What is machine learning?', '["A subset of AI", "A programming language", "A database", "A web framework"]', 0, null, 2, NOW()),
('q2-2b17c1ad-4968-4c66-a79b-98dfe9c776c8', '2b17c1ad-4968-4c66-a79b-98dfe9c776c8', 'multiple_choice', 'Which type of learning uses labeled data?', '["Supervised learning", "Unsupervised learning", "Reinforcement learning", "Deep learning"]', 0, null, 2, NOW())
ON CONFLICT (id) DO UPDATE SET
    quiz_id = EXCLUDED.quiz_id,
    type = EXCLUDED.type,
    prompt = EXCLUDED.prompt,
    options = EXCLUDED.options,
    correct_option_index = EXCLUDED.correct_option_index,
    answer_text = EXCLUDED.answer_text,
    difficulty = EXCLUDED.difficulty;

-- Verify the data was inserted
SELECT 
    q.id as quiz_id,
    q.title,
    COUNT(qq.id) as question_count
FROM quiz_quizzes q
LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
WHERE q.id = '2b17c1ad-4968-4c66-a79b-98dfe9c776c8'
GROUP BY q.id, q.title;