/*
# Add contractor trades, service areas, and enterprise tier fields

1. Modified Tables
   - `profiles`:
     - `trades` (text[]) - list of trade specialties a contractor handles (e.g. general_construction, framing, plumbing). Used to route job alerts to matching contractors.
     - `service_zips` (text[]) - list of ZIP codes an enterprise/large contractor covers for multi-region coverage.
     - `is_enterprise` (boolean, default false) - marks large company / general contractor accounts with extended coverage.
     - `accepts_subcontracts` (boolean, default false) - enterprise accounts that can both receive client jobs and post sub-contracts.

2. Security
   - No RLS changes. Existing profiles policies continue to apply.

3. Notes
   1. All columns are nullable or defaulted so existing rows are unaffected.
   2. `trades` supersedes the older single `trade_category` for multi-trade selection; `trade_category` is retained for backward compatibility.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='trades') THEN
    ALTER TABLE profiles ADD COLUMN trades text[] DEFAULT '{}'::text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='service_zips') THEN
    ALTER TABLE profiles ADD COLUMN service_zips text[] DEFAULT '{}'::text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_enterprise') THEN
    ALTER TABLE profiles ADD COLUMN is_enterprise boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='accepts_subcontracts') THEN
    ALTER TABLE profiles ADD COLUMN accepts_subcontracts boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_trades ON profiles USING gin (trades);
