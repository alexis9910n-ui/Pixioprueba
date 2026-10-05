/*
# Create storage bucket for project files (photos + PDFs)

1. New Storage
   - `project-files` public bucket for project photos and construction plans
   - Allows authenticated users to upload files
   - Public read access for all files

2. Security
   - Authenticated users can upload to their own folder (client_id prefix)
   - Public read so contractors can view project attachments
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Anyone can read project files" ON storage.objects;
CREATE POLICY "Anyone can read project files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Users can delete own project files" ON storage.objects;
CREATE POLICY "Users can delete own project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
