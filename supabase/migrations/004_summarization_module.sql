-- Summarization Module Database Schema
-- This migration creates all tables required for the Intelligent Summarization Module

-- Create folders table for document organization
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table for file storage and metadata
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table for vector search
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create summaries table for generated summaries
CREATE TABLE IF NOT EXISTS summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary_type VARCHAR(50) NOT NULL CHECK (summary_type IN ('short', 'medium', 'detailed')),
    language VARCHAR(10) DEFAULT 'en',
    source_documents JSONB DEFAULT '[]',
    query TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create summary_sources table for source citations
CREATE TABLE IF NOT EXISTS summary_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    summary_id UUID REFERENCES summaries(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
    citation_text TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create notes table for structured notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    note_type VARCHAR(50) DEFAULT 'outline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flashcards table for generated flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_summary_type ON summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_summary_sources_summary_id ON summary_sources(summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_sources_document_id ON summary_sources(document_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_document_id ON notes(document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_note_id ON flashcards(note_id);

-- Enable Row Level Security (RLS)
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders
CREATE POLICY "Users can view own folders" ON folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON folders FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for documents
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for document_chunks
CREATE POLICY "Users can view chunks of own documents" ON document_chunks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = document_chunks.document_id
        AND d.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert chunks for own documents" ON document_chunks FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = document_chunks.document_id
        AND d.user_id = auth.uid()
    )
);

-- Create RLS policies for summaries
CREATE POLICY "Users can view own summaries" ON summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own summaries" ON summaries FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for summary_sources
CREATE POLICY "Users can view sources of own summaries" ON summary_sources FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM summaries s
        WHERE s.id = summary_sources.summary_id
        AND s.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert sources for own summaries" ON summary_sources FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM summaries s
        WHERE s.id = summary_sources.summary_id
        AND s.user_id = auth.uid()
    )
);

-- Create RLS policies for notes
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flashcards
CREATE POLICY "Users can view flashcards of own notes" ON flashcards FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = flashcards.note_id
        AND n.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert flashcards for own notes" ON flashcards FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = flashcards.note_id
        AND n.user_id = auth.uid()
    )
);
CREATE POLICY "Users can update flashcards of own notes" ON flashcards FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = flashcards.note_id
        AND n.user_id = auth.uid()
    )
);
CREATE POLICY "Users can delete flashcards of own notes" ON flashcards FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM notes n
        WHERE n.id = flashcards.note_id
        AND n.user_id = auth.uid()
    )
);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON folders TO anon;
GRANT ALL PRIVILEGES ON folders TO authenticated;
GRANT SELECT ON documents TO anon;
GRANT ALL PRIVILEGES ON documents TO authenticated;
GRANT ALL PRIVILEGES ON document_chunks TO authenticated;
GRANT ALL PRIVILEGES ON summaries TO authenticated;
GRANT ALL PRIVILEGES ON summary_sources TO authenticated;
GRANT ALL PRIVILEGES ON notes TO authenticated;
GRANT ALL PRIVILEGES ON flashcards TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();