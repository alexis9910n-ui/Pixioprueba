/*
# Add Inspection Workflow Fields, Avatars Bucket, and Profile Enhancements

1. Modified Tables
   - `job_requests`: Add inspection_date (date), inspection_time_slot (text),
     final_quote_amount (numeric), final_quote_breakdown (jsonb),
     final_quote_status (text), final_quote_notes (text)
   - `profiles`: Relax verification_status check to include 'rejected'

2. New Storage
   - `avatars` bucket (public) for profile avatar images

3. Updated Constraints
   - job_requests.status check now includes: inspection_scheduled,
     inspection_confirmed, final_quote_pending, final_quote_approved

4. Notes
   - All columns are nullable to preserve existing data
   - Status field is text with CHECK constraint, updated to include new values
*/

-- Add inspection and final quote fields to job_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='inspection_date') THEN
    ALTER TABLE job_requests ADD COLUMN inspection_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='inspection_time_slot') THEN
    ALTER TABLE job_requests ADD COLUMN inspection_time_slot text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='final_quote_amount') THEN
    ALTER TABLE job_requests ADD COLUMN final_quote_amount numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='final_quote_breakdown') THEN
    ALTER TABLE job_requests ADD COLUMN final_quote_breakdown jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='final_quote_status') THEN
    ALTER TABLE job_requests ADD COLUMN final_quote_status text DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='job_requests' AND column_name='final_quote_notes') THEN
    ALTER TABLE job_requests ADD COLUMN final_quote_notes text;
  END IF;
END $$;

-- Update the status check constraint to include inspection workflow statuses
ALTER TABLE job_requests DROP CONSTRAINT IF EXISTS job_requests_status_check;
ALTER TABLE job_requests ADD CONSTRAINT job_requests_status_check
  CHECK (status = ANY (ARRAY[
    'open', 'quote_limit_reached', 'inspection_scheduled', 'inspection_confirmed',
    'final_quote_pending', 'final_quote_approved', 'in_progress', 'completed', 'cancelled'
  ]));

-- Update verification_status check to include 'rejected'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status = ANY (ARRAY['unverified', 'pending', 'verified', 'rejected']));

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
CREATE POLICY "Auth users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth users can update own avatars" ON storage.objects;
CREATE POLICY "Auth users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth users can delete own avatars" ON storage.objects;
CREATE POLICY "Auth users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
