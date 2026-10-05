/*
# Add subscription_plan column to profiles

1. Modified Tables
  - `profiles`: Add `subscription_plan` column
    - `subscription_plan` (text, default 'basic') - contractor subscription tier: 'basic', 'pro', 'vip'
    - Used for search ranking and featured contractor display

2. Important Notes
  - Default is 'basic' so all existing contractors get the free tier
  - Admin can upgrade contractors via the admin panel or directly in DB
  - The column is added idempotently (skipped if it already exists)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text NOT NULL DEFAULT 'basic';
  END IF;
END $$;
