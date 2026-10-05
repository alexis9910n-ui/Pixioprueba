/*
# Pixio Seed Data — Categories and Rate Cards

## Overview
Seeds the full catalog of 20 home-service trade categories across 4 groups, plus default
market rate cards for each category (using a generic '000' ZIP prefix that serves as a
fallback when no specific ZIP-prefix rate card matches).

## Categories Seeded (20 total)
- Construction & Structure: framing, roofing, masonry, drywall, insulation
- Specialized Installations: plumbing, electrical, hvac, solar
- Remodeling & Finishes: painting, flooring, carpentry, windows, general_remodel
- Maintenance & Exteriors: landscaping, house_cleaning, commercial_cleaning, pressure_washing, fencing, trash_removal

## Rate Cards
- One default rate card per category with zip_prefix '000' (universal fallback).
- Prices are realistic US market averages in USD.
- Used by the smart price estimator and anti-dump filter (80% of min).

## Security
- No policy changes. Categories/rate_cards remain read-only to anon+authenticated.
*/

-- ============ CATEGORIES ============
INSERT INTO categories (slug, category_group, icon, sort_order, name_en, name_es) VALUES
('framing', 'construction', 'Building2', 1, 'Framing (Wood/Metal Structures)', 'Framing (Estructuras de Madera/Metal)'),
('roofing', 'construction', 'Home', 2, 'Roofing', 'Techos / Cubiertas'),
('masonry', 'construction', 'BrickWall', 3, 'Masonry / Concrete', 'Mampostería / Concreto'),
('drywall', 'construction', 'Layers', 4, 'Drywall', 'Tablaroca / Drywall'),
('insulation', 'construction', 'Thermometer', 5, 'Insulation', 'Aislamiento (Insulation)'),
('plumbing', 'installations', 'Wrench', 6, 'Plumbing', 'Plomería / Fontanería'),
('electrical', 'installations', 'Zap', 7, 'Electrical', 'Electricidad'),
('hvac', 'installations', 'Wind', 8, 'HVAC (AC & Heating)', 'HVAC (Aire Acondicionado y Calefacción)'),
('solar', 'installations', 'Sun', 9, 'Solar Energy', 'Energía Solar'),
('painting', 'remodeling', 'PaintRoller', 10, 'Painting (Interior/Exterior)', 'Pintura (Interior/Exterior)'),
('flooring', 'remodeling', 'Grid3x3', 11, 'Flooring & Tile', 'Pisos y Azulejos'),
('carpentry', 'remodeling', 'Hammer', 12, 'Carpentry (Cabinets/Woodwork)', 'Carpintería (Cabinets/Madera)'),
('windows', 'remodeling', 'AppWindow', 13, 'Windows & Doors', 'Ventanas y Puertas'),
('general_remodel', 'remodeling', 'Ruler', 14, 'General Remodeling (Kitchens/Baths)', 'Remodelación General (Cocinas/Baños)'),
('landscaping', 'maintenance', 'Trees', 15, 'Landscaping & Lawn Care', 'Jardinería / Paisajismo'),
('house_cleaning', 'maintenance', 'Sparkles', 16, 'Residential Cleaning', 'Limpieza Residencial'),
('commercial_cleaning', 'maintenance', 'Briefcase', 17, 'Commercial / Office Cleaning', 'Limpieza Comercial / Oficinas'),
('pressure_washing', 'maintenance', 'Droplets', 18, 'Pressure Washing', 'Lavado a Presión'),
('fencing', 'maintenance', 'Fence', 19, 'Fencing & Gates', 'Cercas y Portones'),
('trash_removal', 'maintenance', 'Trash2', 20, 'Debris Removal / Trash Hauling', 'Remoción de Escombros / Trash Hauling')
ON CONFLICT (slug) DO NOTHING;

-- ============ RATE CARDS (default '000' fallback for each category) ============
INSERT INTO rate_cards (category_id, zip_prefix, min_hourly, max_hourly, min_project, max_project, unit)
SELECT c.id, '000',
  CASE c.slug
    WHEN 'framing' THEN 45 WHEN 'roofing' THEN 50 WHEN 'masonry' THEN 40 WHEN 'drywall' THEN 35 WHEN 'insulation' THEN 30
    WHEN 'plumbing' THEN 55 WHEN 'electrical' THEN 60 WHEN 'hvac' THEN 55 WHEN 'solar' THEN 50
    WHEN 'painting' THEN 30 WHEN 'flooring' THEN 35 WHEN 'carpentry' THEN 45 WHEN 'windows' THEN 40 WHEN 'general_remodel' THEN 50
    WHEN 'landscaping' THEN 25 WHEN 'house_cleaning' THEN 25 WHEN 'commercial_cleaning' THEN 30 WHEN 'pressure_washing' THEN 35 WHEN 'fencing' THEN 35 WHEN 'trash_removal' THEN 30
  END,
  CASE c.slug
    WHEN 'framing' THEN 75 WHEN 'roofing' THEN 90 WHEN 'masonry' THEN 70 WHEN 'drywall' THEN 60 WHEN 'insulation' THEN 50
    WHEN 'plumbing' THEN 95 WHEN 'electrical' THEN 110 WHEN 'hvac' THEN 100 WHEN 'solar' THEN 85
    WHEN 'painting' THEN 55 WHEN 'flooring' THEN 65 WHEN 'carpentry' THEN 80 WHEN 'windows' THEN 75 WHEN 'general_remodel' THEN 90
    WHEN 'landscaping' THEN 45 WHEN 'house_cleaning' THEN 45 WHEN 'commercial_cleaning' THEN 55 WHEN 'pressure_washing' THEN 65 WHEN 'fencing' THEN 60 WHEN 'trash_removal' THEN 55
  END,
  CASE c.slug
    WHEN 'framing' THEN 1500 WHEN 'roofing' THEN 2000 WHEN 'masonry' THEN 800 WHEN 'drywall' THEN 500 WHEN 'insulation' THEN 400
    WHEN 'plumbing' THEN 150 WHEN 'electrical' THEN 200 WHEN 'hvac' THEN 800 WHEN 'solar' THEN 5000
    WHEN 'painting' THEN 300 WHEN 'flooring' THEN 600 WHEN 'carpentry' THEN 500 WHEN 'windows' THEN 400 WHEN 'general_remodel' THEN 2000
    WHEN 'landscaping' THEN 150 WHEN 'house_cleaning' THEN 100 WHEN 'commercial_cleaning' THEN 200 WHEN 'pressure_washing' THEN 200 WHEN 'fencing' THEN 500 WHEN 'trash_removal' THEN 150
  END,
  CASE c.slug
    WHEN 'framing' THEN 15000 WHEN 'roofing' THEN 12000 WHEN 'masonry' THEN 8000 WHEN 'drywall' THEN 5000 WHEN 'insulation' THEN 3000
    WHEN 'plumbing' THEN 3000 WHEN 'electrical' THEN 5000 WHEN 'hvac' THEN 6000 WHEN 'solar' THEN 30000
    WHEN 'painting' THEN 4000 WHEN 'flooring' THEN 6000 WHEN 'carpentry' THEN 8000 WHEN 'windows' THEN 6000 WHEN 'general_remodel' THEN 30000
    WHEN 'landscaping' THEN 3000 WHEN 'house_cleaning' THEN 500 WHEN 'commercial_cleaning' THEN 2000 WHEN 'pressure_washing' THEN 1500 WHEN 'fencing' THEN 4000 WHEN 'trash_removal' THEN 1000
  END,
  CASE
    WHEN c.slug IN ('plumbing', 'electrical', 'hvac', 'landscaping', 'house_cleaning', 'commercial_cleaning', 'pressure_washing') THEN 'hourly'
    ELSE 'project'
  END
FROM categories c
WHERE NOT EXISTS (SELECT 1 FROM rate_cards rc WHERE rc.category_id = c.id AND rc.zip_prefix = '000');
