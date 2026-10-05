/*
# Seed categories and create storage buckets

1. Seed Data
  - Insert all 36 service categories across 6 groups with bilingual names
  - Insert default rate cards for common categories

2. Storage Buckets
  - project-files: Photos uploaded with job requests (public)
  - job-audio-notes: Voice recordings with job requests (public)
  - category-images: Gallery images managed by admin (public)
  - verification-docs: Identity verification documents (private)
*/

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
INSERT INTO categories (slug, category_group, icon, sort_order, name_en, name_es) VALUES
  ('framing', 'construction', 'Frame', 10, 'Framing', 'Estructura'),
  ('roofing', 'construction', 'Home', 20, 'Roofing', 'Techos'),
  ('siding', 'construction', 'Layers', 30, 'Siding', 'Revestimiento'),
  ('drywall', 'construction', 'Square', 40, 'Drywall', 'Paneles de Yeso'),
  ('concrete', 'construction', 'Box', 50, 'Concrete & Masonry', 'Concreto y Mamposteria'),
  ('foundation', 'construction', 'Landmark', 60, 'Foundation', 'Cimientos'),
  ('demolition', 'construction', 'Hammer', 70, 'Demolition', 'Demolicion'),
  ('structural-steel', 'construction', 'Building2', 80, 'Structural Steel', 'Acero Estructural'),
  ('plumbing', 'installations', 'Wrench', 110, 'Plumbing', 'Plomeria'),
  ('electrical', 'installations', 'Zap', 120, 'Electrical', 'Electricidad'),
  ('hvac', 'installations', 'Wind', 130, 'HVAC', 'Aire Acondicionado'),
  ('solar-panels', 'installations', 'Sun', 140, 'Solar Panels', 'Paneles Solares'),
  ('insulation', 'installations', 'Thermometer', 150, 'Insulation', 'Aislamiento'),
  ('fire-protection', 'installations', 'Flame', 160, 'Fire Protection', 'Proteccion Contra Incendios'),
  ('security-systems', 'installations', 'Shield', 170, 'Security Systems', 'Sistemas de Seguridad'),
  ('kitchen', 'remodeling', 'ChefHat', 210, 'Kitchen Remodeling', 'Remodelacion de Cocina'),
  ('bathroom', 'remodeling', 'Bath', 220, 'Bathroom Remodeling', 'Remodelacion de Bano'),
  ('flooring', 'remodeling', 'Grid3x3', 230, 'Flooring', 'Pisos'),
  ('painting', 'remodeling', 'Paintbrush', 240, 'Painting', 'Pintura'),
  ('windows-doors', 'remodeling', 'DoorOpen', 250, 'Windows & Doors', 'Ventanas y Puertas'),
  ('cabinets', 'remodeling', 'Archive', 260, 'Cabinets & Counters', 'Gabinetes y Encimeras'),
  ('tile', 'remodeling', 'LayoutGrid', 270, 'Tile Work', 'Azulejo'),
  ('general-maintenance', 'maintenance', 'Settings', 310, 'General Maintenance', 'Mantenimiento General'),
  ('pool-maintenance', 'maintenance', 'Waves', 320, 'Pool Maintenance', 'Mantenimiento de Piscinas'),
  ('pest-control', 'maintenance', 'Bug', 330, 'Pest Control', 'Control de Plagas'),
  ('appliance-repair', 'maintenance', 'Cog', 340, 'Appliance Repair', 'Reparacion de Electrodomesticos'),
  ('garage-door', 'maintenance', 'PanelTop', 350, 'Garage Door', 'Puerta de Garaje'),
  ('handyman', 'maintenance', 'Wrench', 360, 'Handyman', 'Servicios Generales'),
  ('landscaping', 'landscaping', 'Trees', 410, 'Landscaping', 'Jardineria / Paisajismo'),
  ('irrigation', 'landscaping', 'Droplets', 420, 'Irrigation', 'Riego'),
  ('fencing', 'landscaping', 'Fence', 430, 'Fencing', 'Cercas'),
  ('outdoor-living', 'landscaping', 'Tent', 440, 'Outdoor Living / Decks', 'Espacios Exteriores / Terrazas'),
  ('tree-service', 'landscaping', 'TreeDeciduous', 450, 'Tree Service', 'Servicio de Arboles'),
  ('residential-cleaning', 'cleaning', 'SprayCan', 510, 'Residential Cleaning', 'Limpieza Residencial'),
  ('commercial-cleaning', 'cleaning', 'Building', 520, 'Commercial Cleaning', 'Limpieza Comercial'),
  ('post-construction', 'cleaning', 'HardHat', 530, 'Post-Construction Cleanup', 'Limpieza Post-Construccion')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DEFAULT RATE CARDS
-- ============================================================
INSERT INTO rate_cards (category_id, zip_prefix, min_hourly, max_hourly, min_project, max_project, unit)
SELECT c.id, '000', 35, 85, 500, 15000, 'project'
FROM categories c
WHERE c.slug IN ('framing','roofing','siding','drywall','concrete','plumbing','electrical','hvac','kitchen','bathroom','flooring','painting','landscaping')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('project-files', 'project-files', true),
  ('job-audio-notes', 'job-audio-notes', true),
  ('category-images', 'category-images', true),
  ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-files
DROP POLICY IF EXISTS "Auth upload project files" ON storage.objects;
CREATE POLICY "Auth upload project files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Public read project files" ON storage.objects;
CREATE POLICY "Public read project files" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'project-files');

-- Storage policies for job-audio-notes
DROP POLICY IF EXISTS "Auth upload audio notes" ON storage.objects;
CREATE POLICY "Auth upload audio notes" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-audio-notes');

DROP POLICY IF EXISTS "Public read audio notes" ON storage.objects;
CREATE POLICY "Public read audio notes" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'job-audio-notes');

-- Storage policies for category-images
DROP POLICY IF EXISTS "Auth upload category images" ON storage.objects;
CREATE POLICY "Auth upload category images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images');

DROP POLICY IF EXISTS "Public read category images" ON storage.objects;
CREATE POLICY "Public read category images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'category-images');

-- Storage policies for verification-docs
DROP POLICY IF EXISTS "Auth upload verification docs" ON storage.objects;
CREATE POLICY "Auth upload verification docs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verification-docs');

DROP POLICY IF EXISTS "Users read own verification docs" ON storage.objects;
CREATE POLICY "Users read own verification docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
