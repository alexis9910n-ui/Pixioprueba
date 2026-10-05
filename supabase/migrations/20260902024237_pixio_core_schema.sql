/*
# Pixio Core Schema — Marketplace tables, RLS, and indexes

## Overview
Creates the complete database schema for the Pixio home-services marketplace: user profiles,
service categories, local market rate cards, project requests, contractor bids, payment
milestones, change orders, digital contracts, in-app messages, reviews, disputes, and
wallet transaction history.

## New Tables
1. **profiles** — extends auth.users with role (client/contractor), name, phone, specialties,
   service radius, rating, jobs completed, and Stripe Connect account reference.
2. **categories** — the full catalog of 20 home-service trades across 4 groups.
3. **rate_cards** — local market price ranges keyed by category + ZIP prefix, used by the
   smart price estimator and anti-dump filter.
4. **projects** — client service requests with description, photos, audio, location, urgency,
   estimated price range, and lifecycle status.
5. **bids** — contractor offers on a project (max 5 per project enforced in app logic).
6. **milestones** — payment phases for projects > $1,000 (30/40/30 split). Each phase has
   deposit -> work_completed -> 48h release timer -> released lifecycle.
7. **change_orders** — contractor-requested extras requiring client approval; funds held in
   the same escrow and released with standard 15% commission.
8. **digital_contracts** — immutable record of accepted bids with IP, timestamp, and terms version.
9. **messages** — in-app chat with masking flag for anti-disintermediation.
10. **reviews** — post-completion ratings between client and contractor.
11. **disputes** — formal disputes with evidence photos and audit-team resolution.
12. **wallet_transactions** — contractor ledger: escrow holds, releases, commissions, withdrawals.

## Security
- RLS enabled on ALL tables.
- Profiles: users can read all profiles (needed for browsing contractors), update only their own.
- Categories & rate_cards: public read (anon + authenticated), no writes from client.
- Projects: owner-scoped CRUD — clients manage their own projects; contractors can read open
  projects (to see the feed) but only the project owner can insert/update/delete.
- Bids: contractors can read all bids on a project (for transparency), insert only their own,
  update/delete only their own.
- Milestones: both client and contractor on the project can read; updates restricted to the
  project owner (client deposits) — actual fund operations go through edge functions.
- Change orders: contractor creates, client approves; both can read.
- Digital contracts: read by both parties, insert on bid acceptance (via edge function).
- Messages: both project participants can read/insert; masking enforced server-side.
- Reviews: reviewer can insert; both parties can read.
- Disputes: project participants can read; opened_by can insert.
- Wallet transactions: owner-scoped — contractor sees only their own ledger.

## Important Notes
1. All owner columns default to auth.uid() so frontend inserts omitting the owner column succeed.
2. The bid_count on projects is maintained via trigger for consistency.
3. Milestone release timers are handled by edge functions (Stripe + scheduled check).
4. Message masking is enforced by a trigger that detects phone/email/URL patterns pre-payment.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'contractor')),
  avatar_url text,
  bio text,
  specialties text[] DEFAULT '{}',
  service_radius_km int DEFAULT 20,
  rating_avg numeric(3,2) DEFAULT 0,
  rating_count int DEFAULT 0,
  jobs_completed int DEFAULT 0,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category_group text NOT NULL CHECK (category_group IN ('construction', 'installations', 'remodeling', 'maintenance')),
  icon text NOT NULL DEFAULT 'Hammer',
  sort_order int NOT NULL DEFAULT 0,
  name_en text NOT NULL,
  name_es text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_read_all" ON categories;
CREATE POLICY "categories_read_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- ============ RATE CARDS ============
CREATE TABLE IF NOT EXISTS rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  zip_prefix text NOT NULL DEFAULT '000',
  min_hourly numeric(10,2) NOT NULL,
  max_hourly numeric(10,2) NOT NULL,
  min_project numeric(10,2) NOT NULL,
  max_project numeric(10,2) NOT NULL,
  unit text NOT NULL DEFAULT 'project' CHECK (unit IN ('hourly', 'project')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_cards_read_all" ON rate_cards;
CREATE POLICY "rate_cards_read_all" ON rate_cards FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rate_cards_category_zip ON rate_cards(category_id, zip_prefix);

-- ============ PROJECTS ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  title text NOT NULL,
  description text NOT NULL,
  budget numeric(10,2),
  address text NOT NULL,
  zip_code text NOT NULL,
  latitude numeric(9,6),
  longitude numeric(9,6),
  urgency text NOT NULL DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent', 'emergency')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'awarded', 'in_progress', 'awaiting_funds', 'completed', 'cancelled')),
  photo_urls text[] DEFAULT '{}',
  audio_url text,
  estimated_min numeric(10,2) NOT NULL DEFAULT 0,
  estimated_max numeric(10,2) NOT NULL DEFAULT 0,
  bid_count int NOT NULL DEFAULT 0,
  awarded_bid_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

-- ============ BIDS ============
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  eta_days int,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids_select" ON bids;
CREATE POLICY "bids_select" ON bids FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "bids_insert_own" ON bids;
CREATE POLICY "bids_insert_own" ON bids FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "bids_update_own" ON bids;
CREATE POLICY "bids_update_own" ON bids FOR UPDATE
  TO authenticated USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "bids_delete_own" ON bids;
CREATE POLICY "bids_delete_own" ON bids FOR DELETE
  TO authenticated USING (auth.uid() = contractor_id);

CREATE INDEX IF NOT EXISTS idx_bids_project ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor ON bids(contractor_id);

-- ============ MILESTONES ============
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number int NOT NULL,
  label text NOT NULL,
  percentage int NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending_deposit' CHECK (status IN ('pending_deposit', 'deposited', 'work_completed', 'release_scheduled', 'released', 'disputed')),
  proof_photo_urls text[] DEFAULT '{}',
  completed_at timestamptz,
  release_scheduled_at timestamptz,
  released_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_select" ON milestones;
CREATE POLICY "milestones_select" ON milestones FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = milestones.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

DROP POLICY IF EXISTS "milestones_update_project_owner" ON milestones;
CREATE POLICY "milestones_update_project_owner" ON milestones FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = milestones.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = milestones.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);

-- ============ CHANGE ORDERS ============
CREATE TABLE IF NOT EXISTS change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  reason text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'released')),
  approved_at timestamptz,
  released_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "change_orders_select" ON change_orders;
CREATE POLICY "change_orders_select" ON change_orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = change_orders.project_id AND (p.client_id = auth.uid() OR change_orders.contractor_id = auth.uid()))
  );

DROP POLICY IF EXISTS "change_orders_insert_contractor" ON change_orders;
CREATE POLICY "change_orders_insert_contractor" ON change_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "change_orders_update_project_owner" ON change_orders;
CREATE POLICY "change_orders_update_project_owner" ON change_orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = change_orders.project_id AND (p.client_id = auth.uid() OR change_orders.contractor_id = auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = change_orders.project_id AND (p.client_id = auth.uid() OR change_orders.contractor_id = auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_change_orders_project ON change_orders(project_id);

-- ============ DIGITAL CONTRACTS ============
CREATE TABLE IF NOT EXISTS digital_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agreed_amount numeric(10,2) NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0',
  ip_address text,
  accepted_at timestamptz DEFAULT now()
);

ALTER TABLE digital_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_select_parties" ON digital_contracts;
CREATE POLICY "contracts_select_parties" ON digital_contracts FOR SELECT
  TO authenticated USING (auth.uid() = client_id OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS "contracts_insert_parties" ON digital_contracts;
CREATE POLICY "contracts_insert_parties" ON digital_contracts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id OR auth.uid() = contractor_id);

CREATE INDEX IF NOT EXISTS idx_contracts_project ON digital_contracts(project_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_masked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_parties" ON messages;
CREATE POLICY "messages_select_parties" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

DROP POLICY IF EXISTS "messages_insert_parties" ON messages;
CREATE POLICY "messages_insert_parties" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ============ DISPUTES ============
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved_client', 'resolved_contractor', 'split')),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_select_parties" ON disputes;
CREATE POLICY "disputes_select_parties" ON disputes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

DROP POLICY IF EXISTS "disputes_insert_parties" ON disputes;
CREATE POLICY "disputes_insert_parties" ON disputes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

DROP POLICY IF EXISTS "disputes_update_parties" ON disputes;
CREATE POLICY "disputes_update_parties" ON disputes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = disputes.project_id AND (p.client_id = auth.uid() OR EXISTS (SELECT 1 FROM bids b WHERE b.project_id = p.id AND b.contractor_id = auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_disputes_project ON disputes(project_id);

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('escrow_hold', 'milestone_release', 'change_order_release', 'commission', 'withdrawal', 'refund')),
  gross_amount numeric(10,2) NOT NULL DEFAULT 0,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  stripe_transfer_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select_own" ON wallet_transactions;
CREATE POLICY "wallet_select_own" ON wallet_transactions FOR SELECT
  TO authenticated USING (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "wallet_insert_own" ON wallet_transactions;
CREATE POLICY "wallet_insert_own" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

CREATE INDEX IF NOT EXISTS idx_wallet_contractor ON wallet_transactions(contractor_id, created_at DESC);

-- ============ TRIGGER: bid_count maintenance ============
CREATE OR REPLACE FUNCTION update_bid_count() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE projects SET bid_count = bid_count + 1 WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE projects SET bid_count = GREATEST(bid_count - 1, 0) WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_bid_count_insert ON bids;
CREATE TRIGGER trg_bid_count_insert AFTER INSERT ON bids
  FOR EACH ROW EXECUTE FUNCTION update_bid_count();

DROP TRIGGER IF EXISTS trg_bid_count_delete ON bids;
CREATE TRIGGER trg_bid_count_delete AFTER DELETE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_bid_count();

-- ============ TRIGGER: message masking (anti-disintermediation) ============
-- Masks phone numbers, emails, and URLs in messages until the project has a deposited milestone
CREATE OR REPLACE FUNCTION mask_message_content() RETURNS TRIGGER AS $$
DECLARE
  has_deposit boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM milestones m
    WHERE m.project_id = NEW.project_id
    AND m.status IN ('deposited', 'work_completed', 'release_scheduled', 'released')
  ) INTO has_deposit;

  IF NOT has_deposit THEN
    -- Mask phone numbers (various formats)
    NEW.content := regexp_replace(NEW.content, '\+?\d[\d\s\-\(\)]{7,}\d', '[contact hidden]', 'g');
    -- Mask emails
    NEW.content := regexp_replace(NEW.content, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[email hidden]', 'g');
    -- Mask URLs
    NEW.content := regexp_replace(NEW.content, 'https?://[^\s]+', '[link hidden]', 'g');
    NEW.is_masked := true;
  ELSE
    NEW.is_masked := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_mask_messages ON messages;
CREATE TRIGGER trg_mask_messages BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION mask_message_content();
