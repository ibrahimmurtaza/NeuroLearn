-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Set up storage policies for documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Grant permissions to anon and authenticated roles for existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notebook_files TO authenticated;
GRANT SELECT ON files TO anon;
GRANT SELECT ON notebook_files TO anon;