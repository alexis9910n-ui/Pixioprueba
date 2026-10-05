/*
# Add status_message column to profiles

1. Modified Tables
   - `profiles`: Add status_message (text, nullable) for client personal status/message

2. Notes
   - Used by clients as a short personal message or status
   - Nullable, no default
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status_message') THEN
    ALTER TABLE profiles ADD COLUMN status_message text;
  END IF;
END $$;
