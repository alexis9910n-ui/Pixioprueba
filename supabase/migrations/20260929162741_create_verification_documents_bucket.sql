/*
# Create verification-documents storage bucket

1. New Storage Bucket
  - `verification-documents`: Private bucket for identity verification uploads (document photos, selfies)

2. Security
  - Authenticated users can upload to their own folder (path prefix = userId)
  - Authenticated users can read their own uploads
  - Public read is disabled (bucket is private)
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth upload verification docs" ON storage.objects;
CREATE POLICY "Auth upload verification docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Auth read own verification docs" ON storage.objects;
CREATE POLICY "Auth read own verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Auth update own verification docs" ON storage.objects;
CREATE POLICY "Auth update own verification docs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
