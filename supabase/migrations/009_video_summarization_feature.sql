-- Video Summarization Feature Database Schema
-- Migration: 009_video_summarization_feature.sql
-- Created: 2024
-- Description: Creates tables for video summaries, transcripts, timestamps, and frames

-- Video Summaries Table
CREATE TABLE video_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    video_url TEXT,
    video_file_path TEXT,
    duration INTEGER, -- in seconds
    summary TEXT NOT NULL,
    key_points JSONB, -- array of key points
    summary_options JSONB, -- length, focus, language settings
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Transcripts Table
CREATE TABLE video_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_summary_id UUID REFERENCES video_summaries(id) ON DELETE CASCADE,
    start_time DECIMAL(10,3) NOT NULL, -- timestamp in seconds
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    confidence DECIMAL(3,2), -- transcription confidence score
    speaker VARCHAR(100), -- if speaker identification available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Timestamps Table
CREATE TABLE video_timestamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_summary_id UUID REFERENCES video_summaries(id) ON DELETE CASCADE,
    timestamp DECIMAL(10,3) NOT NULL, -- time in seconds
    title VARCHAR(200) NOT NULL,
    description TEXT,
    importance VARCHAR(20) CHECK (importance IN ('high', 'medium', 'low')),
    category VARCHAR(100), -- topic, action-item, key-point, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video Frames Table
CREATE TABLE video_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_summary_id UUID REFERENCES video_summaries(id) ON DELETE CASCADE,
    timestamp DECIMAL(10,3) NOT NULL,
    frame_path TEXT NOT NULL, -- Supabase storage path
    description TEXT,
    frame_type VARCHAR(50), -- keyframe, slide, chart, etc.
    analysis_data JSONB, -- AI analysis results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_video_summaries_user_id ON video_summaries(user_id);
CREATE INDEX idx_video_summaries_created_at ON video_summaries(created_at DESC);
CREATE INDEX idx_video_summaries_status ON video_summaries(processing_status);
CREATE INDEX idx_video_transcripts_video_id ON video_transcripts(video_summary_id);
CREATE INDEX idx_video_transcripts_time ON video_transcripts(start_time);
CREATE INDEX idx_video_timestamps_video_id ON video_timestamps(video_summary_id);
CREATE INDEX idx_video_timestamps_time ON video_timestamps(timestamp);
CREATE INDEX idx_video_frames_video_id ON video_frames(video_summary_id);
CREATE INDEX idx_video_frames_timestamp ON video_frames(timestamp);

-- Row Level Security Policies
ALTER TABLE video_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_frames ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_summaries
CREATE POLICY "Users can manage their own video summaries" ON video_summaries
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for video_transcripts
CREATE POLICY "Users can access transcripts of their videos" ON video_transcripts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM video_summaries 
        WHERE id = video_transcripts.video_summary_id 
        AND user_id = auth.uid()
    ));

-- RLS Policies for video_timestamps
CREATE POLICY "Users can access timestamps of their videos" ON video_timestamps
    FOR ALL USING (EXISTS (
        SELECT 1 FROM video_summaries 
        WHERE id = video_timestamps.video_summary_id 
        AND user_id = auth.uid()
    ));

-- RLS Policies for video_frames
CREATE POLICY "Users can access frames of their videos" ON video_frames
    FOR ALL USING (EXISTS (
        SELECT 1 FROM video_summaries 
        WHERE id = video_frames.video_summary_id 
        AND user_id = auth.uid()
    ));

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON video_summaries TO authenticated;
GRANT ALL PRIVILEGES ON video_transcripts TO authenticated;
GRANT ALL PRIVILEGES ON video_timestamps TO authenticated;
GRANT ALL PRIVILEGES ON video_frames TO authenticated;

-- Grant select permissions to anon users (for public summaries if needed)
GRANT SELECT ON video_summaries TO anon;
GRANT SELECT ON video_transcripts TO anon;
GRANT SELECT ON video_timestamps TO anon;
GRANT SELECT ON video_frames TO anon;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_summaries_updated_at BEFORE UPDATE
    ON video_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE video_summaries IS 'Stores video summary metadata and AI-generated summaries';
COMMENT ON TABLE video_transcripts IS 'Stores timestamped transcript segments from videos';
COMMENT ON TABLE video_timestamps IS 'Stores important timestamps and key moments in videos';
COMMENT ON TABLE video_frames IS 'Stores extracted video frames with AI analysis data';

COMMENT ON COLUMN video_summaries.processing_status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN video_summaries.summary_options IS 'JSON object containing summary preferences (length, focus, language)';
COMMENT ON COLUMN video_summaries.key_points IS 'JSON array of extracted key points with importance levels';
COMMENT ON COLUMN video_transcripts.confidence IS 'Transcription confidence score between 0.00 and 1.00';
COMMENT ON COLUMN video_timestamps.importance IS 'Importance level: high, medium, low';
COMMENT ON COLUMN video_frames.analysis_data IS 'JSON object containing AI analysis results for the frame';