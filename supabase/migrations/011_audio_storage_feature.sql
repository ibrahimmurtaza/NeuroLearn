-- Audio Storage Feature Migration
-- This migration creates storage buckets and tables for audio file processing and summarization

-- Create storage bucket for audio files (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  false, -- Private bucket
  209715200, -- 200MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac', 'audio/flac']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for audio waveforms (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-waveforms',
  'audio-waveforms',
  true, -- Public bucket for waveform visualization data
  1048576, -- 1MB limit per waveform file
  ARRAY['application/json', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create audio_files table for audio metadata
CREATE TABLE IF NOT EXISTS audio_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    duration_seconds DECIMAL(10,2),
    bitrate INTEGER,
    sample_rate INTEGER,
    channels INTEGER,
    format_metadata JSONB DEFAULT '{}',
    waveform_url TEXT,
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_transcripts table for storing transcriptions
CREATE TABLE IF NOT EXISTS audio_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    confidence_score DECIMAL(3,2),
    word_timestamps JSONB DEFAULT '[]',
    speaker_segments JSONB DEFAULT '[]',
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_summaries table for AI-generated summaries
CREATE TABLE IF NOT EXISTS audio_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES audio_transcripts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary_text TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    summary_type VARCHAR(50) NOT NULL CHECK (summary_type IN ('short', 'medium', 'detailed')),
    language VARCHAR(10) DEFAULT 'en',
    speaker_analysis JSONB DEFAULT '{}',
    emotion_analysis JSONB DEFAULT '{}',
    topic_analysis JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_chapters table for chapter/segment information
CREATE TABLE IF NOT EXISTS audio_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    summary_id UUID REFERENCES audio_summaries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time DECIMAL(10,2) NOT NULL,
    end_time DECIMAL(10,2) NOT NULL,
    summary TEXT,
    key_points JSONB DEFAULT '[]',
    chapter_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_folder_id ON audio_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_processing_status ON audio_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_audio_files_created_at ON audio_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_files_duration ON audio_files(duration_seconds);

CREATE INDEX IF NOT EXISTS idx_audio_transcripts_audio_file_id ON audio_transcripts(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_user_id ON audio_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_language ON audio_transcripts(language);

CREATE INDEX IF NOT EXISTS idx_audio_summaries_audio_file_id ON audio_summaries(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_audio_summaries_user_id ON audio_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_summaries_summary_type ON audio_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_audio_summaries_created_at ON audio_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_chapters_audio_file_id ON audio_chapters(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_audio_chapters_summary_id ON audio_chapters(summary_id);
CREATE INDEX IF NOT EXISTS idx_audio_chapters_start_time ON audio_chapters(start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_chapters ENABLE ROW LEVEL SECURITY;

-- RLS policies for audio_files
CREATE POLICY "Users can view own audio files" ON audio_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audio files" ON audio_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio files" ON audio_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio files" ON audio_files FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for audio_transcripts
CREATE POLICY "Users can view own audio transcripts" ON audio_transcripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audio transcripts" ON audio_transcripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio transcripts" ON audio_transcripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio transcripts" ON audio_transcripts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for audio_summaries
CREATE POLICY "Users can view own audio summaries" ON audio_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audio summaries" ON audio_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio summaries" ON audio_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio summaries" ON audio_summaries FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for audio_chapters
CREATE POLICY "Users can view chapters of own audio" ON audio_chapters FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM audio_files af
        WHERE af.id = audio_chapters.audio_file_id
        AND af.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert chapters for own audio" ON audio_chapters FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM audio_files af
        WHERE af.id = audio_chapters.audio_file_id
        AND af.user_id = auth.uid()
    )
);
CREATE POLICY "Users can update chapters of own audio" ON audio_chapters FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM audio_files af
        WHERE af.id = audio_chapters.audio_file_id
        AND af.user_id = auth.uid()
    )
);
CREATE POLICY "Users can delete chapters of own audio" ON audio_chapters FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM audio_files af
        WHERE af.id = audio_chapters.audio_file_id
        AND af.user_id = auth.uid()
    )
);

-- Storage policies for audio-files bucket (private)
CREATE POLICY "Users can upload their own audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own audio files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'audio-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for audio-waveforms bucket (public)
CREATE POLICY "Users can upload audio waveforms" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-waveforms' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view audio waveforms" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-waveforms');

CREATE POLICY "Users can update their own audio waveforms" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'audio-waveforms' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio waveforms" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-waveforms' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON audio_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audio_transcripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audio_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audio_chapters TO authenticated;

-- Grant read access to anonymous users for public data
GRANT SELECT ON audio_files TO anon;
GRANT SELECT ON audio_summaries TO anon;

-- Create function to clean up orphaned audio storage
CREATE OR REPLACE FUNCTION cleanup_orphaned_audio_storage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete audio files that don't have corresponding audio_files records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'audio-files'
    AND NOT EXISTS (
      SELECT 1 FROM audio_files af 
      WHERE af.storage_path LIKE '%' || objects.name || '%'
    )
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete waveforms that don't have corresponding audio_files records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'audio-waveforms'
    AND NOT EXISTS (
      SELECT 1 FROM audio_files af 
      WHERE af.waveform_url LIKE '%' || objects.name || '%'
    )
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_audio_storage() TO authenticated;

-- Create view for audio storage usage tracking
CREATE OR REPLACE VIEW audio_storage_usage AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  AVG((metadata->>'size')::bigint) as avg_file_size_bytes,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM storage.objects 
WHERE bucket_id IN ('audio-files', 'audio-waveforms')
GROUP BY bucket_id;

-- Grant access to the usage view
GRANT SELECT ON audio_storage_usage TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_audio_files_updated_at BEFORE UPDATE ON audio_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_summaries_updated_at BEFORE UPDATE ON audio_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE audio_files IS 'Stores metadata for uploaded audio files';
COMMENT ON TABLE audio_transcripts IS 'Stores transcriptions of audio files with timestamps';
COMMENT ON TABLE audio_summaries IS 'Stores AI-generated summaries and analysis of audio content';
COMMENT ON TABLE audio_chapters IS 'Stores chapter/segment information for audio files';

COMMENT ON COLUMN audio_files.duration_seconds IS 'Duration of audio file in seconds';
COMMENT ON COLUMN audio_files.bitrate IS 'Audio bitrate in kbps';
COMMENT ON COLUMN audio_files.sample_rate IS 'Audio sample rate in Hz';
COMMENT ON COLUMN audio_files.channels IS 'Number of audio channels (1=mono, 2=stereo)';
COMMENT ON COLUMN audio_transcripts.confidence_score IS 'Transcription confidence score (0.0-1.0)';
COMMENT ON COLUMN audio_transcripts.word_timestamps IS 'Array of word-level timestamps';
COMMENT ON COLUMN audio_transcripts.speaker_segments IS 'Array of speaker identification segments';
COMMENT ON COLUMN audio_summaries.speaker_analysis IS 'Analysis of speakers in the audio';
COMMENT ON COLUMN audio_summaries.emotion_analysis IS 'Emotional tone analysis of the audio';
COMMENT ON COLUMN audio_summaries.topic_analysis IS 'Topic and theme analysis';