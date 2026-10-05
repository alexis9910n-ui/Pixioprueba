/*
# Add breakdown JSONB column to job_quotes

1. Modified Tables
   - `job_quotes`
     - `breakdown` (jsonb, nullable) — Stores structured line-item estimate data
       including categories, descriptions, quantities, unit prices, subtotals,
       tax/overhead percentage, warranty terms, and payment milestones.

2. Important Notes
   - This column allows contractors to submit professional itemized estimates
     while keeping the flat `proposed_amount` as the canonical total.
   - Existing rows will have NULL breakdown (backwards compatible).
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_quotes'
      AND column_name = 'breakdown'
  ) THEN
    ALTER TABLE public.job_quotes ADD COLUMN breakdown jsonb;
  END IF;
END $$;
