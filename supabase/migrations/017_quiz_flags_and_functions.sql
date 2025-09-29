-- Create quiz_question_flags table for flagging questions
CREATE TABLE IF NOT EXISTS quiz_question_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
    reviewed_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add flag_count column to quiz_questions table
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Create indexes for quiz_question_flags
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_question_id ON quiz_question_flags(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_quiz_id ON quiz_question_flags(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_flagged_by ON quiz_question_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_status ON quiz_question_flags(status);
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_priority ON quiz_question_flags(priority);
CREATE INDEX IF NOT EXISTS idx_quiz_question_flags_created_at ON quiz_question_flags(created_at);

-- Create function to increment question flag count
CREATE OR REPLACE FUNCTION increment_question_flag_count(question_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE quiz_questions 
    SET flag_count = flag_count + 1,
        updated_at = NOW()
    WHERE id = question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update flag count when flags are deleted
CREATE OR REPLACE FUNCTION decrement_question_flag_count(question_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE quiz_questions 
    SET flag_count = GREATEST(flag_count - 1, 0),
        updated_at = NOW()
    WHERE id = question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update flag count when flags are deleted
CREATE OR REPLACE FUNCTION handle_flag_deletion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM decrement_question_flag_count(OLD.question_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_flag_deletion
    AFTER DELETE ON quiz_question_flags
    FOR EACH ROW
    EXECUTE FUNCTION handle_flag_deletion();

-- Create function to get flagged questions for admin review
CREATE OR REPLACE FUNCTION get_flagged_questions(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT NULL
)
RETURNS TABLE (
    flag_id UUID,
    question_id UUID,
    quiz_id UUID,
    quiz_title TEXT,
    question_text TEXT,
    question_type TEXT,
    flag_reason TEXT,
    flag_description TEXT,
    flag_category TEXT,
    flag_status TEXT,
    flag_priority TEXT,
    flag_count INTEGER,
    flagged_by UUID,
    flagged_at TIMESTAMPTZ,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as flag_id,
        f.question_id,
        f.quiz_id,
        q.title as quiz_title,
        qu.question as question_text,
        qu.type as question_type,
        f.reason as flag_reason,
        f.description as flag_description,
        f.category as flag_category,
        f.status as flag_status,
        f.priority as flag_priority,
        qu.flag_count,
        f.flagged_by,
        f.created_at as flagged_at,
        f.reviewed_by,
        f.reviewed_at
    FROM quiz_question_flags f
    JOIN quiz_questions qu ON f.question_id = qu.id
    JOIN quiz_quizzes q ON f.quiz_id = q.id
    WHERE 
        (p_status IS NULL OR f.status = p_status)
        AND (p_priority IS NULL OR f.priority = p_priority)
    ORDER BY 
        CASE f.priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
        END,
        f.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on quiz_question_flags
ALTER TABLE quiz_question_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_question_flags
CREATE POLICY "Users can view their own flags" ON quiz_question_flags
    FOR SELECT USING (flagged_by = auth.uid());

CREATE POLICY "Users can create flags" ON quiz_question_flags
    FOR INSERT WITH CHECK (flagged_by = auth.uid());

CREATE POLICY "Users can update their own pending flags" ON quiz_question_flags
    FOR UPDATE USING (flagged_by = auth.uid() AND status = 'pending');

-- Admin policy (assuming admin role exists)
CREATE POLICY "Admins can manage all flags" ON quiz_question_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON quiz_question_flags TO authenticated;
GRANT EXECUTE ON FUNCTION increment_question_flag_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_question_flag_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_flagged_questions(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Grant permissions to anon role for basic access
GRANT SELECT ON quiz_question_flags TO anon;