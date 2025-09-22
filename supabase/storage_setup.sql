-- Supabase Storage Setup for Video Summarization Feature
-- This file sets up storage buckets and policies for video files and frames

-- Create storage bucket for video files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-files',
  'video-files',
  false, -- Private bucket
  104857600, -- 100MB limit per file
  ARRAY['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/m4v']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for video frames/thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-frames',
  'video-frames',
  true, -- Public bucket for easy access to frames
  5242880, -- 5MB limit per frame
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbnails',
  'video-thumbnails',
  true, -- Public bucket for thumbnails
  2097152, -- 2MB limit per thumbnail
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for video-files bucket (private)
-- Policy: Users can upload their own video files
CREATE POLICY "Users can upload their own video files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'video-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own video files
CREATE POLICY "Users can view their own video files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'video-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own video files
CREATE POLICY "Users can update their own video files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'video-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own video files
CREATE POLICY "Users can delete their own video files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'video-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for video-frames bucket (public)
-- Policy: Users can upload frames for their videos
CREATE POLICY "Users can upload video frames" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'video-frames' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view video frames (public bucket)
CREATE POLICY "Anyone can view video frames" ON storage.objects
FOR SELECT USING (bucket_id = 'video-frames');

-- Policy: Users can update their own video frames
CREATE POLICY "Users can update their own video frames" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'video-frames' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own video frames
CREATE POLICY "Users can delete their own video frames" ON storage.objects
FOR DELETE USING (
  bucket_id = 'video-frames' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for video-thumbnails bucket (public)
-- Policy: Users can upload thumbnails for their videos
CREATE POLICY "Users can upload video thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'video-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view video thumbnails (public bucket)
CREATE POLICY "Anyone can view video thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'video-thumbnails');

-- Policy: Users can update their own video thumbnails
CREATE POLICY "Users can update their own video thumbnails" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'video-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own video thumbnails
CREATE POLICY "Users can delete their own video thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'video-thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Grant read access to anonymous users for public buckets
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id_name ON storage.objects(bucket_id, name);
CREATE INDEX IF NOT EXISTS idx_storage_objects_owner ON storage.objects(owner);
CREATE INDEX IF NOT EXISTS idx_storage_objects_created_at ON storage.objects(created_at);

-- Comments for documentation
COMMENT ON TABLE storage.buckets IS 'Storage buckets for video summarization feature';
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size allowed in bytes';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Array of allowed MIME types for uploads';

-- Storage bucket usage tracking (optional)
CREATE OR REPLACE VIEW video_storage_usage AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  AVG((metadata->>'size')::bigint) as avg_file_size_bytes,
  MIN(created_at) as first_upload,
  MAX(created_at) as last_upload
FROM storage.objects 
WHERE bucket_id IN ('video-files', 'video-frames', 'video-thumbnails')
GROUP BY bucket_id;

-- Grant access to the usage view
GRANT SELECT ON video_storage_usage TO authenticated;

-- Function to clean up orphaned storage objects
CREATE OR REPLACE FUNCTION cleanup_orphaned_video_storage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete video files that don't have corresponding video_summaries records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'video-files'
    AND NOT EXISTS (
      SELECT 1 FROM video_summaries vs 
      WHERE vs.video_url LIKE '%' || objects.name || '%'
    )
    AND created_at < NOW() - INTERVAL '7 days'; -- Only delete files older than 7 days
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete frames that don't have corresponding video_frames records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'video-frames'
    AND NOT EXISTS (
      SELECT 1 FROM video_frames vf 
      WHERE vf.frame_url LIKE '%' || objects.name || '%'
    )
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Delete thumbnails that don't have corresponding video_summaries records
  DELETE FROM storage.objects 
  WHERE bucket_id = 'video-thumbnails'
    AND NOT EXISTS (
      SELECT 1 FROM video_summaries vs 
      WHERE vs.thumbnail_url LIKE '%' || objects.name || '%'
    )
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_video_storage() TO authenticated;

-- Create a scheduled job to run cleanup weekly (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-video-storage', '0 2 * * 0', 'SELECT cleanup_orphaned_video_storage();');

-- Storage configuration constants
CREATE OR REPLACE VIEW storage_config AS
SELECT 
  'video-files' as bucket_name,
  104857600 as max_file_size, -- 100MB
  ARRAY['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv', 'video/m4v'] as allowed_types,
  false as is_public
UNION ALL
SELECT 
  'video-frames' as bucket_name,
  5242880 as max_file_size, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as allowed_types,
  true as is_public
UNION ALL
SELECT 
  'video-thumbnails' as bucket_name,
  2097152 as max_file_size, -- 2MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as allowed_types,
  true as is_public;

-- Grant access to storage config view
GRANT SELECT ON storage_config TO authenticated, anon;