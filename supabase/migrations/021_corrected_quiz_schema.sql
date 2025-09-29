-- Corrected Quiz Module Schema Migration
-- This migration creates a properly structured quiz module schema that addresses all identified inconsistencies
-- and ensures compatibility with the existing codebase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean recreation)
DROP TABLE IF EXISTS quiz_attempt_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_user_stats CASCADE;
DROP TABLE IF EXISTS quiz_question_evidence CASCADE;
DROP TABLE IF EXISTS quiz_question_flags CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_quizzes CASCADE;
DROP TABLE IF EXISTS quiz_chunks CASCADE;
DROP TABLE IF EXISTS quiz_documents CASCADE;

-- Quiz Documents Table
CREATE TABLE quiz_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('pdf', 'txt', 'video', 'audio', 'md')),
    uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Chunks Table (using doc_id as expected by codebase)
CREATE TABLE quiz_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL REFERENCES quiz_documents(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    page INTEGER,
    embedding_id VARCHAR(255),
    embedding vector(1536)
);

-- Quiz Quizzes Table (with all required fields)
CREATE TABLE quiz_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_ids UUID[] DEFAULT '{}',
    mode VARCHAR(20) DEFAULT 'practice' CHECK (mode IN ('practice', 'timed', 'adaptive')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    time_limit INTEGER, -- minutes, null for untimed
    difficulty_range VARCHAR(10) DEFAULT '1-5',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions Table (with all required fields and proper naming)
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quiz_quizzes(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mcq', 'short_answer', 'fill_blank', 'tf', 'numeric')),
    prompt TEXT NOT NULL,
    options JSONB, -- array of options for MCQ
    correct_option_index INTEGER,
    answer_text TEXT,
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
    source_doc_ids JSONB, -- array of document IDs
    generated_by VARCHAR(50) DEFAULT 'llm_v1',
    verified BOOLEAN DEFAULT false,
    verification_reason TEXT,
    flag_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Question Flags Table
CREATE TABLE quiz_question_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quiz_quizzes(id) ON DELETE CASCADE,
    flagged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN (
        'incorrect_answer',
        'unclear_question', 
        'multiple_correct_answers',
        'no_correct_answer',
        'irrelevant_content',
        'technical_error',
        'inappropriate_content',
        'other'
    )),
    description TEXT,
    category TEXT DEFAULT 'content' CHECK (category IN ('content', 'technical', 'formatting', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Question Evidence Table (with proper field names)
CREATE TABLE quiz_question_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES quiz_chunks(id) ON DELETE CASCADE,
    start_pos INTEGER NOT NULL,
    end_pos INTEGER NOT NULL,
    text_snippet TEXT NOT NULL
);

-- Quiz Attempts Table
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quiz_quizzes(id) ON DELETE CASCADE,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Quiz Attempt Answers Table
CREATE TABLE quiz_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer JSONB, -- flexible for different answer types
    is_correct BOOLEAN NOT NULL,
    time_taken_ms INTEGER
);

-- Quiz User Stats Table
CREATE TABLE quiz_user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    skill_theta DOUBLE PRECISION DEFAULT 0.0, -- adaptive difficulty score
    attempts_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic)
);

-- Performance Indexes
CREATE INDEX idx_quiz_documents_uploader ON quiz_documents(uploader_id);
CREATE INDEX idx_quiz_documents_created ON quiz_documents(created_at DESC);
CREATE INDEX idx_quiz_documents_source_type ON quiz_documents(source_type);

CREATE INDEX idx_quiz_chunks_doc_id ON quiz_chunks(doc_id);
CREATE INDEX idx_quiz_chunks_embedding ON quiz_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_quiz_chunks_doc_id_embedding ON quiz_chunks(doc_id) WHERE embedding IS NOT NULL;
CREATE INDEX idx_quiz_chunks_text_search ON quiz_chunks USING gin (to_tsvector('english', text));

CREATE INDEX idx_quiz_quizzes_creator ON quiz_quizzes(creator_id);
CREATE INDEX idx_quiz_quizzes_user_id ON quiz_quizzes(user_id);
CREATE INDEX idx_quiz_quizzes_status ON quiz_quizzes(status);
CREATE INDEX idx_quiz_quizzes_mode ON quiz_quizzes(mode);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_type ON quiz_questions(type);
CREATE INDEX idx_quiz_questions_difficulty ON quiz_questions(difficulty);
CREATE INDEX idx_quiz_questions_verified ON quiz_questions(verified);
CREATE INDEX idx_quiz_questions_flag_count ON quiz_questions(flag_count) WHERE flag_count > 0;
CREATE INDEX idx_quiz_questions_updated_at ON quiz_questions(updated_at);

CREATE INDEX idx_quiz_question_flags_question_id ON quiz_question_flags(question_id);
CREATE INDEX idx_quiz_question_flags_quiz_id ON quiz_question_flags(quiz_id);
CREATE INDEX idx_quiz_question_flags_flagged_by ON quiz_question_flags(flagged_by);
CREATE INDEX idx_quiz_question_flags_status ON quiz_question_flags(status);
CREATE INDEX idx_quiz_question_flags_priority ON quiz_question_flags(priority);
CREATE INDEX idx_quiz_question_flags_created_at ON quiz_question_flags(created_at);

CREATE INDEX idx_quiz_evidence_question ON quiz_question_evidence(question_id);
CREATE INDEX idx_quiz_evidence_chunk ON quiz_question_evidence(chunk_id);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_started_at ON quiz_attempts(started_at);

CREATE INDEX idx_quiz_answers_attempt ON quiz_attempt_answers(attempt_id);
CREATE INDEX idx_quiz_answers_question ON quiz_attempt_answers(question_id);

CREATE INDEX idx_quiz_stats_user ON quiz_user_stats(user_id);
CREATE INDEX idx_quiz_stats_topic ON quiz_user_stats(topic);

-- Triggers and Functions
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quiz_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_questions_updated_at();

CREATE OR REPLACE FUNCTION update_quiz_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_documents_updated_at_trigger
    BEFORE UPDATE ON quiz_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_documents_updated_at();

-- Flag management functions
CREATE OR REPLACE FUNCTION handle_flag_deletion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quiz_questions 
    SET flag_count = GREATEST(flag_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.question_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flag_deletion
    AFTER DELETE ON quiz_question_flags
    FOR EACH ROW
    EXECUTE FUNCTION handle_flag_deletion();

-- Enable Row Level Security
ALTER TABLE quiz_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_flags ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Users can update chunks of their documents" ON quiz_chunks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quiz_documents 
            WHERE quiz_documents.id = quiz_chunks.doc_id 
            AND quiz_documents.uploader_id = auth.uid()
        )
    );

-- RLS Policies for quiz_quizzes
CREATE POLICY "Users can view their own quizzes" ON quiz_quizzes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quizzes" ON quiz_quizzes
    FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" ON quiz_quizzes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" ON quiz_quizzes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for quiz_questions
CREATE POLICY "Users can view questions of their quizzes" ON quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_quizzes 
            WHERE quiz_quizzes.id = quiz_questions.quiz_id 
            AND quiz_quizzes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions for their quizzes" ON quiz_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_quizzes 
            WHERE quiz_quizzes.id = quiz_questions.quiz_id 
            AND quiz_quizzes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update questions of their quizzes" ON quiz_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quiz_quizzes 
            WHERE quiz_quizzes.id = quiz_questions.quiz_id 
            AND quiz_quizzes.user_id = auth.uid()
        )
    );

-- RLS Policies for quiz_question_flags
CREATE POLICY "Users can view their own flags" ON quiz_question_flags
    FOR SELECT USING (flagged_by = auth.uid());

CREATE POLICY "Users can create flags" ON quiz_question_flags
    FOR INSERT WITH CHECK (flagged_by = auth.uid());

CREATE POLICY "Users can update their own pending flags" ON quiz_question_flags
    FOR UPDATE USING (flagged_by = auth.uid() AND status = 'pending');

-- RLS Policies for quiz_question_evidence
CREATE POLICY "Users can view evidence for their questions" ON quiz_question_evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quiz_quizzes ON quiz_quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_evidence.question_id 
            AND quiz_quizzes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert evidence for their questions" ON quiz_question_evidence
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quiz_quizzes ON quiz_quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_evidence.question_id 
            AND quiz_quizzes.user_id = auth.uid()
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
GRANT ALL PRIVILEGES ON quiz_question_flags TO authenticated;
GRANT ALL PRIVILEGES ON quiz_question_evidence TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempts TO authenticated;
GRANT ALL PRIVILEGES ON quiz_attempt_answers TO authenticated;
GRANT ALL PRIVILEGES ON quiz_user_stats TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;