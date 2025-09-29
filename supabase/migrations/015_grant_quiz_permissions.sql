-- Grant permissions for quiz tables to anon and authenticated roles

-- Grant SELECT permissions to anon role (for public access)
GRANT SELECT ON quiz_documents TO anon;
GRANT SELECT ON quiz_chunks TO anon;
GRANT SELECT ON quiz_quizzes TO anon;
GRANT SELECT ON quiz_questions TO anon;
GRANT SELECT ON quiz_question_evidence TO anon;
GRANT SELECT ON quiz_attempts TO anon;
GRANT SELECT ON quiz_attempt_answers TO anon;
GRANT SELECT ON quiz_user_stats TO anon;

-- Grant full permissions to authenticated role
GRANT ALL PRIVILEGES ON quiz_documents TO authenticated;
GRANT ALL PRIVILEGES ON quiz_chunks TO authenticated;
GRANT ALL PRIVILEGES ON quiz_quizzes TO authenticated;
GRANT ALL PRIVILEGES ON quiz_questions TO authenticated;
GRANT ALL PRIVILEGES ON quiz_question_evidence TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempts TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempt_answers TO authenticated;
GRANT ALL PRIVILEGES ON quiz_user_stats TO authenticated;

-- Verify permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name LIKE 'quiz_%' 
ORDER BY table_name, grantee;