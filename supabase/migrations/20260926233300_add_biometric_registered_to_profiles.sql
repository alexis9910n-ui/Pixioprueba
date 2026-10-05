/*
# Add biometric_registered column to profiles

1. Modified Tables
  - `profiles`: Add `biometric_registered` column
    - `biometric_registered` (boolean, default false) - tracks whether the user has been
      offered and completed WebAuthn passkey registration. Replaces localStorage flag
      with server-persisted state.

2. Important Notes
  - Default is false so existing users will be offered biometric on next login
  - Idempotent: skips if column already exists
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'biometric_registered'
  ) THEN
    ALTER TABLE profiles ADD COLUMN biometric_registered boolean NOT NULL DEFAULT false;
  END IF;
END $$;
