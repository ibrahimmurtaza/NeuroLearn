-- Quiz Module Database Migration
-- Creates all tables for the Quiz Module with proper indexes and RLS policies

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Quiz Documents Table
CREATE TABLE quiz_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('pdf', 'txt', 'video', 'audio', 'md')),
    uploader_id UUID NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_documents_uploader ON quiz_documents(uploader_id);
CREATE INDEX idx_quiz_documents_created ON quiz_documents(created_at DESC);

-- Quiz Chunks Table
CREATE TABLE quiz_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES quiz_documents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    page INTEGER,
    embedding_id VARCHAR(255),
    embedding vector(1536)
);

CREATE INDEX idx_quiz_chunks_doc_id ON quiz_chunks(doc_id);
CREATE INDEX idx_quiz_chunks_embedding ON quiz_chunks USING ivfflat (embedding vector_cosine_ops);

-- Quiz Quizzes Table
CREATE TABLE quiz_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    creator_id UUID NOT NULL,
    time_limit INTEGER, -- minutes, null for untimed
    difficulty_range VARCHAR(10) DEFAULT '1-5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_quizzes_creator ON quiz_quizzes(creator_id);

-- Quiz Questions Table
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quiz_quizzes(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('mcq', 'short_answer', 'fill_blank', 'tf', 'numeric')),
    prompt TEXT NOT NULL,
    options JSONB, -- array of options for MCQ
    correct_option_index INTEGER,
    answer_text TEXT,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    source_doc_ids JSONB, -- array of document IDs
    generated_by VARCHAR(50) DEFAULT 'llm_v1',
    verified BOOLEAN DEFAULT false,
    verification_reason TEXT
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_verified ON quiz_questions(verified);

-- Quiz Question Evidence Table
CREATE TABLE quiz_question_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES quiz_chunks(id) ON DELETE CASCADE,
    start_pos INTEGER NOT NULL,
    end_pos INTEGER NOT NULL,
    text_snippet TEXT NOT NULL
);

CREATE INDEX idx_quiz_evidence_question ON quiz_question_evidence(question_id);

-- Quiz Attempts Table
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    quiz_id UUID REFERENCES quiz_quizzes(id) ON DELETE CASCADE,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Quiz Attempt Answers Table
CREATE TABLE quiz_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer JSONB, -- flexible for different answer types
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER
);

CREATE INDEX idx_quiz_answers_attempt ON quiz_attempt_answers(attempt_id);

-- Quiz User Stats Table
CREATE TABLE quiz_user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic VARCHAR(255) NOT NULL,
    skill_theta FLOAT DEFAULT 0.0, -- adaptive difficulty score
    attempts_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic)
);

CREATE INDEX idx_quiz_stats_user ON quiz_user_stats(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE quiz_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_documents
CREATE POLICY "Users can view their own documents" ON quiz_documents
    FOR SELECT USING (auth.uid() = uploader_id);

CREATE POLICY "Users can insert their own documents" ON quiz_documents
    FOR INSERT WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update their own documents" ON quiz_documents
    FOR UPDATE USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete their own documents" ON quiz_documents
    FOR DELETE USING (auth.uid() = uploader_id);

-- RLS Policies for quiz_chunks
CREATE POLICY "Users can view chunks of their documents" ON quiz_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_documents 
            WHERE quiz_documents.id = quiz_chunks.doc_id 
            AND quiz_documents.uploader_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chunks for their documents" ON quiz_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_documents 
            WHERE quiz_documents.id = quiz_chunks.doc_id 
            AND quiz_documents.uploader_id = auth.uid()
        )
    );

-- RLS Policies for quiz_quizzes
CREATE POLICY "Users can view their own quizzes" ON quiz_quizzes
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert their own quizzes" ON quiz_quizzes
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" ON quiz_quizzes
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" ON quiz_quizzes
    FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view questions of their quizzes" ON quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_quizzes 
            WHERE quiz_quizzes.id = quiz_questions.quiz_id 
            AND quiz_quizzes.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions for their quizzes" ON quiz_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_quizzes 
            WHERE quiz_quizzes.id = quiz_questions.quiz_id 
            AND quiz_quizzes.creator_id = auth.uid()
        )
    );

-- RLS Policies for quiz_question_evidence
CREATE POLICY "Users can view evidence for their questions" ON quiz_question_evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quiz_quizzes ON quiz_quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_evidence.question_id 
            AND quiz_quizzes.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert evidence for their questions" ON quiz_question_evidence
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quiz_quizzes ON quiz_quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_evidence.question_id 
            AND quiz_quizzes.creator_id = auth.uid()
        )
    );

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can view their own attempts" ON quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON quiz_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for quiz_attempt_answers
CREATE POLICY "Users can view their own attempt answers" ON quiz_attempt_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_attempts 
            WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id 
            AND quiz_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own attempt answers" ON quiz_attempt_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_attempts 
            WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id 
            AND quiz_attempts.user_id = auth.uid()
        )
    );

-- RLS Policies for quiz_user_stats
CREATE POLICY "Users can view their own stats" ON quiz_user_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON quiz_user_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON quiz_user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON quiz_documents TO anon;
GRANT ALL PRIVILEGES ON quiz_documents TO authenticated;
GRANT ALL PRIVILEGES ON quiz_chunks TO authenticated;
GRANT ALL PRIVILEGES ON quiz_quizzes TO authenticated;
GRANT ALL PRIVILEGES ON quiz_questions TO authenticated;
GRANT ALL PRIVILEGES ON quiz_question_evidence TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempts TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempt_answers TO authenticated;
GRANT ALL PRIVILEGES ON quiz_user_stats TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;