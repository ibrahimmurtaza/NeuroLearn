-- Check if audio storage buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('audio-files', 'audio-waveforms');

-- If buckets don't exist, create them
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('audio-files', 'audio-files', false, 209715200, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac', 'audio/flac']),
  ('audio-waveforms', 'audio-waveforms', true, 1048576, ARRAY['application/json', 'image/png', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies if they don't exist
DO $$
BEGIN
  -- Audio files bucket policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own audio files') THEN
    CREATE POLICY "Users can upload their own audio files" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'audio-files' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own audio files') THEN
    CREATE POLICY "Users can view their own audio files" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'audio-files' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own audio files') THEN
    CREATE POLICY "Users can update their own audio files" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'audio-files' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own audio files') THEN
    CREATE POLICY "Users can delete their own audio files" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'audio-files' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Audio waveforms bucket policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload audio waveforms') THEN
    CREATE POLICY "Users can upload audio waveforms" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'audio-waveforms' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anyone can view audio waveforms') THEN
    CREATE POLICY "Anyone can view audio waveforms" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-waveforms');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own audio waveforms') THEN
    CREATE POLICY "Users can update their own audio waveforms" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'audio-waveforms' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own audio waveforms') THEN
    CREATE POLICY "Users can delete their own audio waveforms" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'audio-waveforms' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;