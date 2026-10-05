import { supabase } from './supabase';
import type { Category } from '../types';

export const CATEGORY_GROUPS = [
  'construction',
  'installations',
  'remodeling',
  'maintenance',
  'automotive',
  'cleaning'
] as const;

// Lista local de categorías de respaldo (oficios completos)
export const DEFAULT_CATEGORIES: Category[] = [
  // Construcción y Estructura
  { id: 'framing', name_es: 'Framing / Estructuras', name_en: 'Framing', category_group: 'construction', active: true, sort_order: 1 },
  { id: 'drywall', name_es: 'Drywall / Tablaroca', name_en: 'Drywall', category_group: 'construction', active: true, sort_order: 2 },
  { id: 'roofing', name_es: 'Roofing / Techos', name_en: 'Roofing', category_group: 'construction', active: true, sort_order: 3 },
  { id: 'siding', name_es: 'Siding / Revestimiento', name_en: 'Siding', category_group: 'construction', active: true, sort_order: 4 },
  { id: 'concrete', name_es: 'Concreto y Masonería', name_en: 'Concrete & Masonry', category_group: 'construction', active: true, sort_order: 5 },

  // Instalaciones y Reparaciones
  { id: 'plumbing', name_es: 'Plomería / Plumbing', name_en: 'Plumbing', category_group: 'installations', active: true, sort_order: 6 },
  { id: 'electrical', name_es: 'Electricidad / Electrical', name_en: 'Electrical', category_group: 'installations', active: true, sort_order: 7 },
  { id: 'hvac', name_es: 'HVAC / Aire y Calefacción', name_en: 'HVAC', category_group: 'installations', active: true, sort_order: 8 },
  { id: 'handyman', name_es: 'Handyman / Reparaciones Generales', name_en: 'Handyman', category_group: 'installations', active: true, sort_order: 9 },

  // Remodelación y Acabados
  { id: 'painting', name_es: 'Pintura / Painting', name_en: 'Painting', category_group: 'remodeling', active: true, sort_order: 10 },
  { id: 'flooring', name_es: 'Pisos y Azulejo / Tile & Flooring', name_en: 'Flooring & Tile', category_group: 'remodeling', active: true, sort_order: 11 },

  // Jardinería y Mantenimiento
  { id: 'landscaping', name_es: 'Landscaping / Jardinería', name_en: 'Landscaping', category_group: 'maintenance', active: true, sort_order: 12 },
  { id: 'lawn_care', name_es: 'Mantenimiento de Jardines / Lawn Care', name_en: 'Lawn Care', category_group: 'maintenance', active: true, sort_order: 13 },
  { id: 'tree_service', name_es: 'Cuidado de Árboles / Tree Service', name_en: 'Tree Service', category_group: 'maintenance', active: true, sort_order: 14 },
  { id: 'snow_removal', name_es: 'Remoción de Nieve / Snow Removal', name_en: 'Snow Removal', category_group: 'maintenance', active: true, sort_order: 15 },

  // Mecánica y Automotriz
  { id: 'mechanic', name_es: 'Mecánica General', name_en: 'General Mechanics', category_group: 'automotive', active: true, sort_order: 16 },
  { id: 'roadside_mechanic', name_es: 'Mecánico a Domicilio / Auxilio Vial', name_en: 'Mobile Mechanic', category_group: 'automotive', active: true, sort_order: 17 },

  // Servicios de Limpieza
  { id: 'housekeeping', name_es: 'Limpieza de Casas / Housekeeping', name_en: 'Housekeeping', category_group: 'cleaning', active: true, sort_order: 18 },
  { id: 'post_construction', name_es: 'Limpieza de Obra / Post-Construction', name_en: 'Post-Construction Cleaning', category_group: 'cleaning', active: true, sort_order: 19 },
  { id: 'pressure_washing', name_es: 'Lavado a Presión / Pressure Washing', name_en: 'Pressure Washing', category_group: 'cleaning', active: true, sort_order: 20 }
];

export function getCategoryName(cat: Category, lang: string): string {
  if (!cat) return '';
  return lang === 'es' ? cat.name_es : cat.name_en;
}

// Special "handles-all-trades" option for general contractors / enterprise accounts.
export const GENERAL_CONSTRUCTION = 'general_construction';

export function generalConstructionLabel(lang: string): string {
  return lang === 'es' ? 'Construccion General' : 'General Construction';
}

/**
 * Decides whether a job (identified by its category slug) should be routed to a
 * contractor given their selected trades. General Construction contractors match
 * every job; otherwise the job's category must be among the contractor's trades.
 */
export function jobMatchesTrades(jobCategory: string | null | undefined, trades: string[] | null | undefined): boolean {
  if (!trades || trades.length === 0) return true; // no trades set yet -> see everything
  if (trades.includes(GENERAL_CONSTRUCTION)) return true;
  if (!jobCategory) return true;
  return trades.includes(jobCategory);
}

export function getGroupLabel(group: string, lang: string): string {
  const labels: Record<string, { en: string; es: string }> = {
    construction: { en: 'Construction & Structure', es: 'Construcción y Estructura' },
    installations: { en: 'Installations & Repairs', es: 'Instalaciones y Reparaciones' },
    remodeling: { en: 'Remodeling & Finishes', es: 'Remodelación y Acabados' },
    maintenance: { en: 'Lawn & Maintenance', es: 'Jardinería y Mantenimiento' },
    automotive: { en: 'Automotive & Mechanic', es: 'Mecánica y Automotriz' },
    cleaning: { en: 'Cleaning Services', es: 'Servicios de Limpieza' }
  };
  return labels[group] ? (lang === 'es' ? labels[group].es : labels[group].en) : group;
}

export function groupCategories(categories: Category[]): Record<string, Category[]> {
  const cats = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  return cats.reduce((acc, cat) => {
    if (!acc[cat.category_group]) {
      acc[cat.category_group] = [];
    }
    acc[cat.category_group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORIES;
    }

    return data;
  } catch (err) {
    return DEFAULT_CATEGORIES;
  }
}
