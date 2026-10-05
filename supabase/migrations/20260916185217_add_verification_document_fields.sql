/*
# Add identity verification document fields to profiles

1. Modified Tables
   - `profiles`
     - `document_type` (text, nullable) - type of ID document: 'id_card', 'drivers_license', 'passport'
     - `document_id_url` (text, nullable) - URL of uploaded ID document photo
     - `selfie_url` (text, nullable) - URL of uploaded selfie (contractors only)

2. Modified Columns on `bids`
   - `labor_cost` (numeric, nullable) - labor portion of bid
   - `materials_cost` (numeric, nullable) - materials portion of bid
   - `estimated_weeks` (numeric, nullable) - estimated time in weeks
   - `warranty_notes` (text, nullable) - warranty/guarantee notes

3. Notes
   - document_type is only set during verification onboarding
   - selfie_url is required only for contractors
   - verification_status already exists on profiles
   - Bid breakdown fields are optional additions to the existing bid
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='document_type') THEN
    ALTER TABLE profiles ADD COLUMN document_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='document_id_url') THEN
    ALTER TABLE profiles ADD COLUMN document_id_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='selfie_url') THEN
    ALTER TABLE profiles ADD COLUMN selfie_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bids' AND column_name='labor_cost') THEN
    ALTER TABLE bids ADD COLUMN labor_cost numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bids' AND column_name='materials_cost') THEN
    ALTER TABLE bids ADD COLUMN materials_cost numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bids' AND column_name='estimated_weeks') THEN
    ALTER TABLE bids ADD COLUMN estimated_weeks numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bids' AND column_name='warranty_notes') THEN
    ALTER TABLE bids ADD COLUMN warranty_notes text;
  END IF;
END $$;
