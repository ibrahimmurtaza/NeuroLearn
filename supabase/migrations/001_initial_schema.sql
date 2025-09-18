-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notebook_files junction table (many-to-many)
CREATE TABLE IF NOT EXISTS notebook_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notebook_id, file_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    sources JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create embeddings table for vector search
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI/Gemini embedding dimension
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_files_notebook_id ON notebook_files(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_files_file_id ON notebook_files(file_id);
CREATE INDEX IF NOT EXISTS idx_conversations_notebook_id ON conversations(notebook_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_file_id ON embeddings(file_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Enable Row Level Security (RLS)
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notebooks
CREATE POLICY "Users can view their own notebooks" ON notebooks
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create notebooks" ON notebooks
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own notebooks" ON notebooks
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own notebooks" ON notebooks
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for files
CREATE POLICY "Users can view files in their notebooks" ON files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebook_files nf
            JOIN notebooks n ON nf.notebook_id = n.id
            WHERE nf.file_id = files.id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can create files" ON files
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update files in their notebooks" ON files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM notebook_files nf
            JOIN notebooks n ON nf.notebook_id = n.id
            WHERE nf.file_id = files.id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can delete files in their notebooks" ON files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebook_files nf
            JOIN notebooks n ON nf.notebook_id = n.id
            WHERE nf.file_id = files.id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

-- Create RLS policies for notebook_files
CREATE POLICY "Users can view notebook_files for their notebooks" ON notebook_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = notebook_files.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can create notebook_files for their notebooks" ON notebook_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = notebook_files.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can delete notebook_files for their notebooks" ON notebook_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = notebook_files.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations in their notebooks" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = conversations.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can create conversations in their notebooks" ON conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks n
            WHERE n.id = conversations.notebook_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

-- Create RLS policies for embeddings
CREATE POLICY "Users can view embeddings for files in their notebooks" ON embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebook_files nf
            JOIN notebooks n ON nf.notebook_id = n.id
            WHERE nf.file_id = embeddings.file_id
            AND (n.user_id = auth.uid() OR n.user_id IS NULL)
        )
    );

CREATE POLICY "Users can create embeddings" ON embeddings
    FOR INSERT WITH CHECK (true);

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON notebooks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON notebook_files TO anon, authenticated;
GRANT SELECT, INSERT ON conversations TO anon, authenticated;
GRANT SELECT, INSERT ON embeddings TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for notebooks updated_at
CREATE TRIGGER update_notebooks_updated_at
    BEFORE UPDATE ON notebooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();