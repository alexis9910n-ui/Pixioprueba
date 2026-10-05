/*
# Replace all categories with the official Pixio trade list

1. Deletes existing categories that are not in the new list
2. Upserts the full set of 18 official trades grouped into 5 groups
3. Excludes automotive/mechanical trades

Groups:
- construction: Framing, Drywall, Roofing, Siding, Concreto y Masoneria
- installations: Plomeria, Electricidad, HVAC, Handyman
- remodeling: Pintura, Pisos y Azulejo
- maintenance: Landscaping, Lawn Care, Tree Service, Snow Removal
- cleaning: Limpieza de Casas, Limpieza de Obra, Lavado a Presion
*/

-- Remove categories not in the new official list
DELETE FROM categories WHERE slug NOT IN (
  'framing','drywall','roofing','siding','masonry',
  'plumbing','electrical','hvac','handyman',
  'painting','flooring',
  'landscaping','lawn_care','tree_service','snow_removal',
  'house_cleaning','post_construction_cleaning','pressure_washing'
);

-- Upsert the official 18 trades
INSERT INTO categories (id, slug, category_group, name_en, name_es, icon, sort_order) VALUES
  (gen_random_uuid(), 'framing', 'construction', 'Framing / Structures', 'Framing / Estructuras', 'Building2', 1),
  (gen_random_uuid(), 'drywall', 'construction', 'Drywall', 'Drywall / Tablaroca', 'Layers', 2),
  (gen_random_uuid(), 'roofing', 'construction', 'Roofing', 'Roofing / Techos', 'Home', 3),
  (gen_random_uuid(), 'siding', 'construction', 'Siding', 'Siding / Revestimiento', 'PanelTop', 4),
  (gen_random_uuid(), 'masonry', 'construction', 'Concrete & Masonry', 'Concreto y Masoneria', 'BrickWall', 5),
  (gen_random_uuid(), 'plumbing', 'installations', 'Plumbing', 'Plomeria / Plumbing', 'Wrench', 6),
  (gen_random_uuid(), 'electrical', 'installations', 'Electrical', 'Electricidad / Electrical', 'Zap', 7),
  (gen_random_uuid(), 'hvac', 'installations', 'HVAC (AC & Heating)', 'HVAC / Aire y Calefaccion', 'Wind', 8),
  (gen_random_uuid(), 'handyman', 'installations', 'Handyman / General Repairs', 'Handyman / Reparaciones Generales', 'Hammer', 9),
  (gen_random_uuid(), 'painting', 'remodeling', 'Painting', 'Pintura / Painting', 'PaintRoller', 10),
  (gen_random_uuid(), 'flooring', 'remodeling', 'Tile & Flooring', 'Pisos y Azulejo / Tile & Flooring', 'Grid3x3', 11),
  (gen_random_uuid(), 'landscaping', 'maintenance', 'Landscaping', 'Landscaping / Jardineria', 'Trees', 12),
  (gen_random_uuid(), 'lawn_care', 'maintenance', 'Lawn Care', 'Mantenimiento de Jardines / Lawn Care', 'Leaf', 13),
  (gen_random_uuid(), 'tree_service', 'maintenance', 'Tree Service', 'Cuidado de Arboles / Tree Service', 'TreePine', 14),
  (gen_random_uuid(), 'snow_removal', 'maintenance', 'Snow Removal', 'Remocion de Nieve / Snow Removal', 'Snowflake', 15),
  (gen_random_uuid(), 'house_cleaning', 'cleaning', 'Housekeeping', 'Limpieza de Casas / Housekeeping', 'Sparkles', 16),
  (gen_random_uuid(), 'post_construction_cleaning', 'cleaning', 'Post-Construction Cleaning', 'Limpieza de Obra / Post-Construction', 'Construction', 17),
  (gen_random_uuid(), 'pressure_washing', 'cleaning', 'Pressure Washing', 'Lavado a Presion / Pressure Washing', 'Droplets', 18)
ON CONFLICT (slug) DO UPDATE SET
  category_group = EXCLUDED.category_group,
  name_en = EXCLUDED.name_en,
  name_es = EXCLUDED.name_es,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;
