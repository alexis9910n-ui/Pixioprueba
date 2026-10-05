/*
# Add category_images and admin_alerts tables

1. New Tables
  - `category_images`: stores example photos per trade category, managed by admin
    - `id` (uuid, primary key)
    - `category_id` (text, references the category slug)
    - `image_url` (text, the public URL from storage)
    - `sort_order` (int, for ordering)
    - `created_at` (timestamp)
  - `admin_alerts`: system event log for the admin notification center
    - `id` (uuid, primary key)
    - `alert_type` (text: payment_release, change_order, dispute, verification)
    - `title` (text, short summary)
    - `description` (text, detail)
    - `project_id` (uuid, nullable reference)
    - `user_id` (uuid, nullable, the user who triggered it)
    - `is_read` (boolean, default false)
    - `created_at` (timestamp)

2. Security
  - RLS enabled on both tables.
  - category_images: anyone can read, only authenticated can insert/update/delete (admin check in app).
  - admin_alerts: only authenticated users can read/insert (admin check in app).

3. Storage
  - Create category-images bucket for admin uploads.
*/

-- category_images table
CREATE TABLE IF NOT EXISTS category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE category_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_category_images" ON category_images;
CREATE POLICY "anyone_can_read_category_images" ON category_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_category_images" ON category_images;
CREATE POLICY "authenticated_insert_category_images" ON category_images FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_category_images" ON category_images;
CREATE POLICY "authenticated_update_category_images" ON category_images FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_category_images" ON category_images;
CREATE POLICY "authenticated_delete_category_images" ON category_images FOR DELETE
  TO authenticated USING (true);

-- admin_alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('payment_release', 'change_order', 'dispute', 'verification')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_admin_alerts" ON admin_alerts;
CREATE POLICY "authenticated_read_admin_alerts" ON admin_alerts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_admin_alerts" ON admin_alerts;
CREATE POLICY "authenticated_insert_admin_alerts" ON admin_alerts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_admin_alerts" ON admin_alerts;
CREATE POLICY "authenticated_update_admin_alerts" ON admin_alerts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone_read_category_images_storage" ON storage.objects;
CREATE POLICY "anyone_read_category_images_storage" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'category-images');

DROP POLICY IF EXISTS "authenticated_upload_category_images_storage" ON storage.objects;
CREATE POLICY "authenticated_upload_category_images_storage" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'category-images');

DROP POLICY IF EXISTS "authenticated_delete_category_images_storage" ON storage.objects;
CREATE POLICY "authenticated_delete_category_images_storage" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'category-images');
