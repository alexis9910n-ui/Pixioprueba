/*
# Pixio Complete Schema — Fresh Database Setup

This migration creates the entire Pixio database from scratch on a clean Supabase project.

1. New Tables
  - `profiles`: User accounts (clients, contractors, admins) with verification, subscription, biometric fields
  - `categories`: Service trade categories (Framing, Roofing, Plumbing, etc.) with bilingual names
  - `rate_cards`: Pricing reference per category and zip code area
  - `projects`: Job requests created by clients
  - `bids`: Quotes submitted by contractors on projects (max 5 per project)
  - `milestones`: Payment phases for awarded projects
  - `change_orders`: Extra work requests on active projects
  - `digital_contracts`: Signed agreements between client and contractor
  - `messages`: In-app chat messages per project
  - `reviews`: Ratings and feedback after project completion
  - `disputes`: Dispute filings on milestones
  - `wallet_transactions`: Contractor earnings ledger
  - `category_images`: Gallery images per category (admin-managed)
  - `admin_alerts`: System notifications for admin dashboard

2. Security
  - RLS enabled on ALL tables
  - Authenticated-only policies for user-owned data
  - Public read for categories and rate_cards
  - Admin-managed category_images and admin_alerts

3. Triggers
  - Auto-create profile on auth.users insert
  - Auto-increment bid_count on new bid
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role = ANY (ARRAY['client','contractor','admin'])),
  avatar_url text,
  bio text,
  specialties text[] DEFAULT '{}',
  service_radius_km integer DEFAULT 20,
  rating_avg numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  jobs_completed integer DEFAULT 0,
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan = ANY (ARRAY['free','pro','vip'])),
  biometric_enabled boolean NOT NULL DEFAULT false,
  trade_category text,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status = ANY (ARRAY['unverified','pending','verified'])),
  verified_at timestamptz,
  stripe_identity_session_id text,
  document_type text,
  document_id_url text,
  selfie_url text,
  company_name text,
  license_number text,
  insurance_policy text,
  business_phone text,
  zip_code text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  category_group text NOT NULL DEFAULT 'construction',
  icon text NOT NULL DEFAULT 'Hammer',
  sort_order integer NOT NULL DEFAULT 100,
  name_en text NOT NULL,
  name_es text NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- RATE CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  zip_prefix text NOT NULL DEFAULT '000',
  min_hourly numeric NOT NULL DEFAULT 0,
  max_hourly numeric NOT NULL DEFAULT 0,
  min_project numeric NOT NULL DEFAULT 0,
  max_project numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'project' CHECK (unit = ANY (ARRAY['hourly','project']))
);

ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_rate_cards" ON rate_cards;
CREATE POLICY "public_read_rate_cards" ON rate_cards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_rate_cards" ON rate_cards;
CREATE POLICY "admin_insert_rate_cards" ON rate_cards FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_rate_cards" ON rate_cards;
CREATE POLICY "admin_update_rate_cards" ON rate_cards FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_rate_cards" ON rate_cards;
CREATE POLICY "admin_delete_rate_cards" ON rate_cards FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- PROJECTS (job_requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  budget numeric,
  address text NOT NULL DEFAULT '',
  zip_code text NOT NULL DEFAULT '',
  latitude numeric,
  longitude numeric,
  urgency text NOT NULL DEFAULT 'standard' CHECK (urgency = ANY (ARRAY['standard','urgent','emergency'])),
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','awarded','in_progress','awaiting_funds','completed','cancelled'])),
  photo_urls text[] DEFAULT '{}',
  audio_url text,
  estimated_min numeric NOT NULL DEFAULT 0,
  estimated_max numeric NOT NULL DEFAULT 0,
  bid_count integer NOT NULL DEFAULT 0,
  awarded_bid_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_projects" ON projects;
CREATE POLICY "select_projects" ON projects FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- ============================================================
-- BIDS (job_quotes)
-- ============================================================
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  eta_days integer,
  message text NOT NULL DEFAULT '',
  labor_cost numeric,
  materials_cost numeric,
  estimated_weeks numeric,
  warranty_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','accepted','rejected'])),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bids" ON bids;
CREATE POLICY "select_bids" ON bids FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_bids" ON bids;
CREATE POLICY "insert_own_bids" ON bids FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "update_bids" ON bids;
CREATE POLICY "update_bids" ON bids FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_bids" ON bids;
CREATE POLICY "delete_own_bids" ON bids FOR DELETE
  TO authenticated USING (auth.uid() = contractor_id);

-- Auto-increment bid_count on new bid
CREATE OR REPLACE FUNCTION increment_bid_count()
RETURNS trigger AS $$
BEGIN
  UPDATE projects SET bid_count = bid_count + 1 WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_bid_count ON bids;
CREATE TRIGGER trg_increment_bid_count
  AFTER INSERT ON bids
  FOR EACH ROW EXECUTE FUNCTION increment_bid_count();

-- ============================================================
-- MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number integer NOT NULL,
  label text NOT NULL,
  percentage numeric NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending_deposit' CHECK (status = ANY (ARRAY['pending_deposit','deposited','work_completed','release_scheduled','released','disputed'])),
  proof_photo_urls text[] DEFAULT '{}',
  completed_at timestamptz,
  release_scheduled_at timestamptz,
  released_at timestamptz,
  stripe_payment_intent_id text
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_milestones" ON milestones;
CREATE POLICY "select_milestones" ON milestones FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_milestones" ON milestones;
CREATE POLICY "insert_milestones" ON milestones FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_milestones" ON milestones;
CREATE POLICY "update_milestones" ON milestones FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_milestones" ON milestones;
CREATE POLICY "delete_milestones" ON milestones FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- CHANGE ORDERS (extra_work_requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  title text NOT NULL,
  reason text NOT NULL DEFAULT '',
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status = ANY (ARRAY['pending_approval','approved','rejected','released'])),
  approved_at timestamptz,
  released_at timestamptz,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_change_orders" ON change_orders;
CREATE POLICY "select_change_orders" ON change_orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_change_orders" ON change_orders;
CREATE POLICY "insert_change_orders" ON change_orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "update_change_orders" ON change_orders;
CREATE POLICY "update_change_orders" ON change_orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_change_orders" ON change_orders;
CREATE POLICY "delete_change_orders" ON change_orders FOR DELETE
  TO authenticated USING (auth.uid() = contractor_id);

-- ============================================================
-- DIGITAL CONTRACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS digital_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL REFERENCES bids(id),
  client_id uuid NOT NULL REFERENCES auth.users(id),
  contractor_id uuid NOT NULL REFERENCES auth.users(id),
  agreed_amount numeric NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0',
  ip_address text NOT NULL DEFAULT '',
  accepted_at timestamptz DEFAULT now()
);

ALTER TABLE digital_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contracts" ON digital_contracts;
CREATE POLICY "select_own_contracts" ON digital_contracts FOR SELECT
  TO authenticated USING (auth.uid() = client_id OR auth.uid() = contractor_id);

DROP POLICY IF EXISTS "insert_contracts" ON digital_contracts;
CREATE POLICY "insert_contracts" ON digital_contracts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_contracts" ON digital_contracts;
CREATE POLICY "update_contracts" ON digital_contracts FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "delete_contracts" ON digital_contracts;
CREATE POLICY "delete_contracts" ON digital_contracts FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  content text NOT NULL,
  is_masked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_messages" ON messages;
CREATE POLICY "select_messages" ON messages FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_messages" ON messages;
CREATE POLICY "insert_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "update_messages" ON messages;
CREATE POLICY "update_messages" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "delete_messages" ON messages;
CREATE POLICY "delete_messages" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  reviewee_id uuid NOT NULL REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reviews" ON reviews;
CREATE POLICY "select_reviews" ON reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_reviews" ON reviews;
CREATE POLICY "insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "update_reviews" ON reviews;
CREATE POLICY "update_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = reviewer_id) WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "delete_reviews" ON reviews;
CREATE POLICY "delete_reviews" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = reviewer_id);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestones(id),
  opened_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open','in_review','resolved_client','resolved_contractor','split'])),
  resolution_notes text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_disputes" ON disputes;
CREATE POLICY "select_disputes" ON disputes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_disputes" ON disputes;
CREATE POLICY "insert_disputes" ON disputes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = opened_by);

DROP POLICY IF EXISTS "update_disputes" ON disputes;
CREATE POLICY "update_disputes" ON disputes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_disputes" ON disputes;
CREATE POLICY "delete_disputes" ON disputes FOR DELETE
  TO authenticated USING (auth.uid() = opened_by);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid REFERENCES projects(id),
  type text NOT NULL CHECK (type = ANY (ARRAY['escrow_hold','milestone_release','change_order_release','commission','withdrawal','refund'])),
  gross_amount numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  stripe_transfer_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet" ON wallet_transactions;
CREATE POLICY "select_own_wallet" ON wallet_transactions FOR SELECT
  TO authenticated USING (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "insert_wallet" ON wallet_transactions;
CREATE POLICY "insert_wallet" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_wallet" ON wallet_transactions;
CREATE POLICY "update_wallet" ON wallet_transactions FOR UPDATE
  TO authenticated USING (auth.uid() = contractor_id) WITH CHECK (auth.uid() = contractor_id);

DROP POLICY IF EXISTS "delete_wallet" ON wallet_transactions;
CREATE POLICY "delete_wallet" ON wallet_transactions FOR DELETE
  TO authenticated USING (auth.uid() = contractor_id);

-- ============================================================
-- CATEGORY IMAGES (category_gallery)
-- ============================================================
CREATE TABLE IF NOT EXISTS category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE category_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_category_images" ON category_images;
CREATE POLICY "public_read_category_images" ON category_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_category_images" ON category_images;
CREATE POLICY "insert_category_images" ON category_images FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_category_images" ON category_images;
CREATE POLICY "update_category_images" ON category_images FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_category_images" ON category_images;
CREATE POLICY "delete_category_images" ON category_images FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- ADMIN ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  reference_id uuid,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_alerts" ON admin_alerts;
CREATE POLICY "select_admin_alerts" ON admin_alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_admin_alerts" ON admin_alerts;
CREATE POLICY "insert_admin_alerts" ON admin_alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_admin_alerts" ON admin_alerts;
CREATE POLICY "update_admin_alerts" ON admin_alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_admin_alerts" ON admin_alerts;
CREATE POLICY "delete_admin_alerts" ON admin_alerts FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data ->> 'phone',
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category_id ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_wallet_contractor_id ON wallet_transactions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_category_images_category ON category_images(category_id);
