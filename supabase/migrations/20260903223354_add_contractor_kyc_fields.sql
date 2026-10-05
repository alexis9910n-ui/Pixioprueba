/*
# Add KYC/KYB fields to profiles

1. Modified Tables
   - `profiles`
     - `company_name` (text, nullable) - contractor's business name
     - `license_number` (text, nullable) - commercial license number
     - `insurance_policy` (text, nullable) - insurance policy number
     - `business_phone` (text, nullable) - business phone number

2. Notes
   - These fields are only relevant for contractor profiles
   - verification_status already exists on profiles
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='company_name') THEN
    ALTER TABLE profiles ADD COLUMN company_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='license_number') THEN
    ALTER TABLE profiles ADD COLUMN license_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='insurance_policy') THEN
    ALTER TABLE profiles ADD COLUMN insurance_policy text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='business_phone') THEN
    ALTER TABLE profiles ADD COLUMN business_phone text;
  END IF;
END $$;
