-- Create video_summaries table
CREATE TABLE IF NOT EXISTS video_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_file_path TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  summary_options JSONB DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT video_summaries_user_id_check CHECK (user_id IS NOT NULL),
  CONSTRAINT video_summaries_source_check CHECK (
    (video_url IS NOT NULL AND video_file_path IS NULL) OR
    (video_url IS NULL AND video_file_path IS NOT NULL)
  )
);

-- Create video_transcripts table
CREATE TABLE IF NOT EXISTS video_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_summary_id UUID NOT NULL REFERENCES video_summaries(id) ON DELETE CASCADE,
  start_time DECIMAL(10,3) NOT NULL,
  end_time DECIMAL(10,3) NOT NULL,
  text TEXT NOT NULL,
  confidence DECIMAL(4,3),
  speaker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT video_transcripts_time_check CHECK (end_time > start_time),
  CONSTRAINT video_transcripts_confidence_check CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

-- Create video_timestamps table
CREATE TABLE IF NOT EXISTS video_timestamps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_summary_id UUID NOT NULL REFERENCES video_summaries(id) ON DELETE CASCADE,
  timestamp DECIMAL(10,3) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('high', 'medium', 'low')),
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT video_timestamps_timestamp_check CHECK (timestamp >= 0)
);

-- Create video_frames table
CREATE TABLE IF NOT EXISTS video_frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_summary_id UUID NOT NULL REFERENCES video_summaries(id) ON DELETE CASCADE,
  timestamp DECIMAL(10,3) NOT NULL,
  frame_path TEXT NOT NULL,
  description TEXT,
  frame_type TEXT DEFAULT 'general' CHECK (frame_type IN ('keyframe', 'slide', 'chart', 'text', 'general')),
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT video_frames_timestamp_check CHECK (timestamp >= 0)
);

-- Create video_processing_progress table
CREATE TABLE IF NOT EXISTS video_processing_progress (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT DEFAULT 'Initializing...',
  total_steps INTEGER DEFAULT 1,
  completed_steps INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT video_processing_progress_steps_check CHECK (completed_steps <= total_steps)
);

-- Create video_processing_errors table
CREATE TABLE IF NOT EXISTS video_processing_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  user_id UUID,
  video_id UUID,
  processing_step TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_summaries_user_id ON video_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_video_summaries_status ON video_summaries(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_summaries_created_at ON video_summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_transcripts_video_summary_id ON video_transcripts(video_summary_id);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_start_time ON video_transcripts(start_time);

CREATE INDEX IF NOT EXISTS idx_video_timestamps_video_summary_id ON video_timestamps(video_summary_id);
CREATE INDEX IF NOT EXISTS idx_video_timestamps_timestamp ON video_timestamps(timestamp);
CREATE INDEX IF NOT EXISTS idx_video_timestamps_importance ON video_timestamps(importance);

CREATE INDEX IF NOT EXISTS idx_video_frames_video_summary_id ON video_frames(video_summary_id);
CREATE INDEX IF NOT EXISTS idx_video_frames_timestamp ON video_frames(timestamp);
CREATE INDEX IF NOT EXISTS idx_video_frames_type ON video_frames(frame_type);

CREATE INDEX IF NOT EXISTS idx_video_processing_progress_user_id ON video_processing_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_progress_status ON video_processing_progress(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_progress_created_at ON video_processing_progress(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_processing_errors_user_id ON video_processing_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_errors_code ON video_processing_errors(error_code);
CREATE INDEX IF NOT EXISTS idx_video_processing_errors_created_at ON video_processing_errors(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_video_summaries_updated_at
    BEFORE UPDATE ON video_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_processing_progress_updated_at
    BEFORE UPDATE ON video_processing_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE video_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_processing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_processing_errors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_summaries
CREATE POLICY "Users can view their own video summaries" ON video_summaries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video summaries" ON video_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video summaries" ON video_summaries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video summaries" ON video_summaries
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for video_transcripts
CREATE POLICY "Users can view transcripts of their videos" ON video_transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_transcripts.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transcripts for their videos" ON video_transcripts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_transcripts.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transcripts of their videos" ON video_transcripts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_transcripts.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transcripts of their videos" ON video_transcripts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_transcripts.video_summary_id 
            AND user_id = auth.uid()
        )
    );

-- Create RLS policies for video_timestamps
CREATE POLICY "Users can view timestamps of their videos" ON video_timestamps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_timestamps.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert timestamps for their videos" ON video_timestamps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_timestamps.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update timestamps of their videos" ON video_timestamps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_timestamps.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete timestamps of their videos" ON video_timestamps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_timestamps.video_summary_id 
            AND user_id = auth.uid()
        )
    );

-- Create RLS policies for video_frames
CREATE POLICY "Users can view frames of their videos" ON video_frames
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_frames.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert frames for their videos" ON video_frames
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_frames.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update frames of their videos" ON video_frames
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_frames.video_summary_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete frames of their videos" ON video_frames
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM video_summaries 
            WHERE id = video_frames.video_summary_id 
            AND user_id = auth.uid()
        )
    );

-- Create RLS policies for video_processing_progress
CREATE POLICY "Users can view their own processing progress" ON video_processing_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing progress" ON video_processing_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing progress" ON video_processing_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processing progress" ON video_processing_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for video_processing_errors
CREATE POLICY "Users can view their own processing errors" ON video_processing_errors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing errors" ON video_processing_errors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON video_summaries TO authenticated;
GRANT ALL PRIVILEGES ON video_transcripts TO authenticated;
GRANT ALL PRIVILEGES ON video_timestamps TO authenticated;
GRANT ALL PRIVILEGES ON video_frames TO authenticated;
GRANT ALL PRIVILEGES ON video_processing_progress TO authenticated;
GRANT ALL PRIVILEGES ON video_processing_errors TO authenticated;

-- Grant read access to anonymous users (if needed for public summaries in the future)
GRANT SELECT ON video_summaries TO anon;
GRANT SELECT ON video_transcripts TO anon;
GRANT SELECT ON video_timestamps TO anon;
GRANT SELECT ON video_frames TO anon;

-- Create storage buckets (this will be handled separately in Supabase dashboard)
-- But we'll add comments for reference:
-- Bucket: 'video-files' - for storing uploaded video files
-- Bucket: 'video-frames' - for storing extracted video frames
-- Both buckets should have RLS enabled with policies allowing users to access their own files

-- Add some helpful comments
COMMENT ON TABLE video_summaries IS 'Stores video summary information and metadata';
COMMENT ON TABLE video_transcripts IS 'Stores video transcript segments with timestamps';
COMMENT ON TABLE video_timestamps IS 'Stores important timestamps and key moments in videos';
COMMENT ON TABLE video_frames IS 'Stores extracted video frames with analysis data';
COMMENT ON TABLE video_processing_progress IS 'Tracks real-time processing progress for video operations';
COMMENT ON TABLE video_processing_errors IS 'Logs errors that occur during video processing';

COMMENT ON COLUMN video_summaries.summary_options IS 'JSON object containing processing options like summaryLength, focusArea, etc.';
COMMENT ON COLUMN video_frames.analysis_data IS 'JSON object containing AI analysis results for the frame';
COMMENT ON COLUMN video_processing_progress.metadata IS 'JSON object containing processing metadata and context';
COMMENT ON COLUMN video_processing_errors.error_details IS 'JSON object containing detailed error information and stack traces';