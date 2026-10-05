/*
# Create new Pixio schema tables (job_requests, job_quotes, etc.)

This migration creates the 6 new tables the user specified alongside the existing tables.
It also adds missing columns to profiles (phone_number, rating).

1. Modified Tables
  - `profiles`: Add `phone_number` text column, add `rating` numeric column

2. New Tables
  - `job_requests`: Client job postings with category (text), audio_note_url, image_urls, quotes_count
  - `job_quotes`: Contractor quotes on jobs, max 5 per job enforced by trigger
  - `extra_work_requests`: Additional work requests during a job
  - `payments`: Escrow payment tracking
  - `disputes_and_claims`: Dispute filings with admin notes
  - `category_gallery`: Portfolio images per category name

3. Security
  - RLS enabled on all new tables
  - Authenticated policies for all CRUD operations
  - Owner-scoped inserts where applicable

4. Triggers
  - Auto-increment quotes_count on job_requests when a new quote is inserted
  - Enforce 5-quote max per job via trigger
  - Auto-create profile trigger updated to include phone_number
*/

-- ============================================================
-- ADD MISSING COLUMNS TO PROFILES
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone_number') THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='rating') THEN
    ALTER TABLE profiles ADD COLUMN rating numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='zip_code') THEN
    ALTER TABLE profiles ADD COLUMN zip_code text;
  END IF;
END $$;

-- ============================================================
-- JOB REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  audio_note_url text,
  image_urls text[] DEFAULT '{}',
  zip_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','quote_limit_reached','in_progress','completed','cancelled'])),
  quotes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_job_requests" ON job_requests;
CREATE POLICY "select_job_requests" ON job_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_job_requests" ON job_requests;
CREATE POLICY "insert_own_job_requests" ON job_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_own_job_requests" ON job_requests;
CREATE POLICY "update_own_job_requests" ON job_requests FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_own_job_requests" ON job_requests;
CREATE POLICY "delete_own_job_requests" ON job_requests FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- ============================================================
-- JOB QUOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS job_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_amount numeric NOT NULL,
  estimated_days integer,
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','accepted','rejected'])),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_job_quotes" ON job_quotes;
CREATE POLICY "select_job_quotes" ON job_quotes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_job_quotes" ON job_quotes;
CREATE POLICY "insert_own_job_quotes" ON job_quotes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "update_job_quotes" ON job_quotes;
CREATE POLICY "update_job_quotes" ON job_quotes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_job_quotes" ON job_quotes;
CREATE POLICY "delete_own_job_quotes" ON job_quotes FOR DELETE
  TO authenticated USING (auth.uid() = contractor_id);

-- Enforce max 5 quotes per job + auto-increment quotes_count
CREATE OR REPLACE FUNCTION handle_new_quote()
RETURNS trigger AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT quotes_count INTO current_count FROM job_requests WHERE id = NEW.job_id;
  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 quotes per job reached';
  END IF;
  UPDATE job_requests SET quotes_count = quotes_count + 1 WHERE id = NEW.job_id;
  IF current_count + 1 >= 5 THEN
    UPDATE job_requests SET status = 'quote_limit_reached' WHERE id = NEW.job_id AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_new_quote ON job_quotes;
CREATE TRIGGER trg_handle_new_quote
  BEFORE INSERT ON job_quotes
  FOR EACH ROW EXECUTE FUNCTION handle_new_quote();

-- ============================================================
-- EXTRA WORK REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS extra_work_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  additional_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE extra_work_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_extra_work" ON extra_work_requests;
CREATE POLICY "select_extra_work" ON extra_work_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_extra_work" ON extra_work_requests;
CREATE POLICY "insert_extra_work" ON extra_work_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requested_by);

DROP POLICY IF EXISTS "update_extra_work" ON extra_work_requests;
CREATE POLICY "update_extra_work" ON extra_work_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_extra_work" ON extra_work_requests;
CREATE POLICY "delete_extra_work" ON extra_work_requests FOR DELETE
  TO authenticated USING (auth.uid() = requested_by);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id),
  contractor_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL DEFAULT 0,
  extra_work_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric GENERATED ALWAYS AS (amount + extra_work_amount) STORED,
  platform_fee numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status = ANY (ARRAY['pending','held_in_escrow','released','refunded','disputed'])),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = client_id OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = client_id OR auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = client_id OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- ============================================================
-- DISPUTES AND CLAIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes_and_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
  filed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  reason text NOT NULL,
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','in_review','resolved_client','resolved_contractor','closed'])),
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disputes_and_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_disputes_claims" ON disputes_and_claims;
CREATE POLICY "select_disputes_claims" ON disputes_and_claims FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_disputes_claims" ON disputes_and_claims;
CREATE POLICY "insert_disputes_claims" ON disputes_and_claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = filed_by);

DROP POLICY IF EXISTS "update_disputes_claims" ON disputes_and_claims;
CREATE POLICY "update_disputes_claims" ON disputes_and_claims FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_disputes_claims" ON disputes_and_claims;
CREATE POLICY "delete_disputes_claims" ON disputes_and_claims FOR DELETE
  TO authenticated USING (auth.uid() = filed_by);

-- ============================================================
-- CATEGORY GALLERY
-- ============================================================
CREATE TABLE IF NOT EXISTS category_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE category_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_category_gallery" ON category_gallery;
CREATE POLICY "public_read_category_gallery" ON category_gallery FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_category_gallery" ON category_gallery;
CREATE POLICY "insert_category_gallery" ON category_gallery FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_category_gallery" ON category_gallery;
CREATE POLICY "update_category_gallery" ON category_gallery FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_category_gallery" ON category_gallery;
CREATE POLICY "delete_category_gallery" ON category_gallery FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- STORAGE BUCKETS (idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Auth upload job photos" ON storage.objects;
CREATE POLICY "Auth upload job photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-photos');

DROP POLICY IF EXISTS "Public read job photos" ON storage.objects;
CREATE POLICY "Public read job photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'job-photos');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_job_requests_client_id ON job_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_quotes_job_id ON job_quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_quotes_contractor_id ON job_quotes(contractor_id);
CREATE INDEX IF NOT EXISTS idx_extra_work_job_id ON extra_work_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON disputes_and_claims(job_id);
CREATE INDEX IF NOT EXISTS idx_category_gallery_name ON category_gallery(category_name);

-- ============================================================
-- UPDATE PROFILE TRIGGER to include phone_number
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'phone_number',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
