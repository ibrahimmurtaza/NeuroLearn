-- Flashcard Generator Feature Database Schema
-- This migration creates tables for the standalone flashcard generator feature
-- Note: This is separate from the existing flashcards table which is tied to notes

-- Create flashcard_sets table for organizing flashcards by topic
CREATE TABLE IF NOT EXISTS flashcard_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flashcard_generator_cards table for individual flashcards
CREATE TABLE IF NOT EXISTS flashcard_generator_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flashcard_documents junction table for tracking source documents
CREATE TABLE IF NOT EXISTS flashcard_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(set_id, document_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_user_id ON flashcard_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_created_at ON flashcard_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_sets_topic ON flashcard_sets(topic);

CREATE INDEX IF NOT EXISTS idx_flashcard_generator_cards_set_id ON flashcard_generator_cards(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_generator_cards_order ON flashcard_generator_cards(set_id, order_index);

CREATE INDEX IF NOT EXISTS idx_flashcard_documents_set_id ON flashcard_documents(set_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_documents_document_id ON flashcard_documents(document_id);

-- Enable Row Level Security (RLS)
ALTER TABLE flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_generator_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for flashcard_sets
CREATE POLICY "Users can view own flashcard sets" ON flashcard_sets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcard sets" ON flashcard_sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcard sets" ON flashcard_sets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcard sets" ON flashcard_sets
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcard_generator_cards
CREATE POLICY "Users can view flashcards from own sets" ON flashcard_generator_cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_generator_cards.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create flashcards in own sets" ON flashcard_generator_cards
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_generator_cards.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update flashcards in own sets" ON flashcard_generator_cards
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_generator_cards.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete flashcards from own sets" ON flashcard_generator_cards
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_generator_cards.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

-- Create RLS policies for flashcard_documents
CREATE POLICY "Users can view flashcard documents from own sets" ON flashcard_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_documents.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create flashcard documents for own sets" ON flashcard_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_documents.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete flashcard documents from own sets" ON flashcard_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM flashcard_sets 
            WHERE flashcard_sets.id = flashcard_documents.set_id 
            AND flashcard_sets.user_id = auth.uid()
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_flashcard_sets_updated_at
    BEFORE UPDATE ON flashcard_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON flashcard_sets TO authenticated;
GRANT ALL PRIVILEGES ON flashcard_generator_cards TO authenticated;
GRANT ALL PRIVILEGES ON flashcard_documents TO authenticated;

GRANT SELECT ON flashcard_sets TO anon;
GRANT SELECT ON flashcard_generator_cards TO anon;
GRANT SELECT ON flashcard_documents TO anon;

-- Add comments to document table purposes
COMMENT ON TABLE flashcard_sets IS 'Stores flashcard sets generated from documents based on specific topics';
COMMENT ON TABLE flashcard_generator_cards IS 'Individual flashcards with questions and answers for the generator feature';
COMMENT ON TABLE flashcard_documents IS 'Junction table linking flashcard sets to their source documents';