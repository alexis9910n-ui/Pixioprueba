import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useCategories } from '@/lib/hooks';
import { getCategoryName } from '@/lib/categories';
import { getIcon } from '@/lib/icons';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ClipboardList, Star, Clock, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

const DESCRIPTIONS: Record<string, { descEs: string; descEn: string }> = {
  framing: {
    descEs: 'Construccion de estructuras de madera y metal para casas, adiciones y edificaciones. Incluye marcos de paredes, techos y pisos.',
    descEn: 'Wood and metal frame construction for homes, additions, and buildings. Includes wall, roof, and floor framing.',
  },
  drywall: {
    descEs: 'Instalacion, reparacion y acabado de tablaroca. Incluye parches, texturizado y preparacion para pintura.',
    descEn: 'Drywall installation, repair, and finishing. Includes patching, texturing, and paint preparation.',
  },
  roofing: {
    descEs: 'Instalacion y reparacion de techos residenciales y comerciales. Tejas, impermeabilizacion y canaletas.',
    descEn: 'Residential and commercial roof installation and repair. Shingles, waterproofing, and gutters.',
  },
  siding: {
    descEs: 'Instalacion de revestimiento exterior: vinilo, madera, fibrocemento y mas. Protege y embellece tu hogar.',
    descEn: 'Exterior siding installation: vinyl, wood, fiber cement, and more. Protect and beautify your home.',
  },
  concrete: {
    descEs: 'Trabajos de concreto y mamposteria: cimientos, banquetas, patios, muros de retencion y reparaciones.',
    descEn: 'Concrete and masonry work: foundations, sidewalks, patios, retaining walls, and repairs.',
  },
  plumbing: {
    descEs: 'Instalacion y reparacion de tuberias, drenajes, calentadores de agua, griferias y sistemas de riego.',
    descEn: 'Pipe, drain, water heater, faucet installation and repair, plus irrigation systems.',
  },
  electrical: {
    descEs: 'Instalacion electrica residencial y comercial: cableado, paneles, iluminacion, tomacorrientes y reparaciones.',
    descEn: 'Residential and commercial electrical: wiring, panels, lighting, outlets, and repairs.',
  },
  hvac: {
    descEs: 'Instalacion y mantenimiento de sistemas de aire acondicionado, calefaccion y ventilacion.',
    descEn: 'HVAC system installation and maintenance: air conditioning, heating, and ventilation.',
  },
  handyman: {
    descEs: 'Reparaciones generales del hogar: ensamblaje de muebles, puertas, cerraduras, estantes y pequenos arreglos.',
    descEn: 'General home repairs: furniture assembly, doors, locks, shelving, and small fixes.',
  },
  painting: {
    descEs: 'Pintura interior y exterior residencial y comercial. Preparacion de superficies, acabados y retoques.',
    descEn: 'Interior and exterior painting for residential and commercial. Surface prep, finishes, and touch-ups.',
  },
  flooring: {
    descEs: 'Instalacion de pisos: azulejo, madera, laminado, vinilo y mas. Incluye nivelacion y preparacion del subpiso.',
    descEn: 'Flooring installation: tile, hardwood, laminate, vinyl, and more. Includes leveling and subfloor prep.',
  },
  landscaping: {
    descEs: 'Diseno y construccion de jardines, patios, caminos, muros decorativos e instalacion de plantas.',
    descEn: 'Garden design and construction, patios, walkways, decorative walls, and plant installation.',
  },
  lawn_care: {
    descEs: 'Mantenimiento de jardines: corte de cesped, fertilizacion, control de maleza y riego.',
    descEn: 'Lawn maintenance: mowing, fertilizing, weed control, and irrigation.',
  },
  tree_service: {
    descEs: 'Poda, tala, remocion de arboles y limpieza de ramas. Cuidado profesional de arboles.',
    descEn: 'Pruning, felling, tree removal, and branch cleanup. Professional tree care.',
  },
  snow_removal: {
    descEs: 'Remocion de nieve en entradas, banquetas y estacionamientos. Servicio residencial y comercial.',
    descEn: 'Snow removal for driveways, sidewalks, and parking lots. Residential and commercial service.',
  },
  mechanic: {
    descEs: 'Diagnostico y reparacion automotriz general: motor, frenos, transmision, suspension y mas.',
    descEn: 'General auto diagnostics and repair: engine, brakes, transmission, suspension, and more.',
  },
  roadside_mechanic: {
    descEs: 'Mecanico a domicilio y auxilio vial: cambio de llantas, baterias, arranque y reparaciones de emergencia.',
    descEn: 'Mobile mechanic and roadside assistance: tire changes, batteries, jump starts, and emergency repairs.',
  },
  housekeeping: {
    descEs: 'Limpieza profesional de casas y departamentos. Regular, profunda o por evento.',
    descEn: 'Professional house and apartment cleaning. Regular, deep, or event-based.',
  },
  post_construction: {
    descEs: 'Limpieza especializada despues de obra: remocion de escombros, polvo, pintura y adhesivos.',
    descEn: 'Specialized post-construction cleanup: debris, dust, paint, and adhesive removal.',
  },
  pressure_washing: {
    descEs: 'Lavado a presion de fachadas, banquetas, entradas, bardas y patios.',
    descEn: 'Pressure washing for facades, sidewalks, driveways, fences, and patios.',
  },
};

const DEFAULT_DESC = {
  descEs: 'Servicio profesional del hogar. Solicita una cotizacion personalizada.',
  descEn: 'Professional home service. Request a personalized quote.',
};

interface ExampleImage {
  id: string;
  image_url: string;
  sort_order: number;
}

export function CategoryGallery({ categoryId }: { categoryId: string }) {
  const { i18n } = useTranslation();
  const { navigate, goBack } = useNavigate();
  const { categories } = useCategories();
  const isEs = i18n.language === 'es';

  const [exampleImages, setExampleImages] = useState<ExampleImage[]>([]);
  const [currentImg, setCurrentImg] = useState(0);

  const cat = categories.find((c) => c.id === categoryId);
  const desc = DESCRIPTIONS[cat?.slug || categoryId] || DEFAULT_DESC;
  const Icon = cat ? getIcon(cat.icon) : getIcon('Hammer');
  const catName = cat ? getCategoryName(cat, i18n.language) : categoryId;

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('category_gallery')
      .select('id, image_url, display_order')
      .eq('category_name', cat?.slug || categoryId)
      .order('display_order')
      .then(({ data }) => {
        if (!cancelled && data) setExampleImages(data);
      });
    return () => { cancelled = true; };
  }, [categoryId]);

  const highlights = [
    {
      icon: ShieldCheck,
      titleEs: 'Contratistas Verificados',
      titleEn: 'Verified Contractors',
      descEs: 'Todos los profesionales pasan por verificacion de identidad.',
      descEn: 'All professionals go through identity verification.',
    },
    {
      icon: Star,
      titleEs: 'Cotizaciones Competitivas',
      titleEn: 'Competitive Bids',
      descEs: 'Recibe multiples ofertas y elige la mejor opcion.',
      descEn: 'Receive multiple offers and choose the best option.',
    },
    {
      icon: Clock,
      titleEs: 'Respuesta Rapida',
      titleEn: 'Fast Response',
      descEs: 'Los contratistas responden en minutos, no en dias.',
      descEn: 'Contractors respond in minutes, not days.',
    },
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <div className="bg-white border-b border-ink-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={goBack} className="p-2 -ml-2 rounded-lg hover:bg-ink-100 text-ink-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <h1 className="text-lg font-bold text-ink-800">{catName}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Example images carousel */}
        {exampleImages.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden mb-5 bg-ink-100 aspect-[16/10]">
            <img
              src={exampleImages[currentImg].image_url}
              alt={`${catName} example ${currentImg + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            {exampleImages.length > 1 && (
              <>
                <button type="button"
                  onClick={() => setCurrentImg((prev) => (prev - 1 + exampleImages.length) % exampleImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button type="button"
                  onClick={() => setCurrentImg((prev) => (prev + 1) % exampleImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {exampleImages.map((_, i) => (
                    <button key={i} type="button" onClick={() => setCurrentImg(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === currentImg ? 'bg-white w-4' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Hero icon + description */}
        <div className="bg-white rounded-2xl border border-ink-100 p-6 mb-5 text-center">
          {exampleImages.length === 0 && (
            <div className="w-20 h-20 rounded-2xl bg-pixio-50 text-pixio-600 flex items-center justify-center mx-auto mb-4">
              <Icon size={36} />
            </div>
          )}
          <h2 className="text-xl font-bold text-ink-800 mb-2">{catName}</h2>
          <p className="text-sm text-ink-600 leading-relaxed">
            {isEs ? desc.descEs : desc.descEn}
          </p>
        </div>

        {/* Thumbnails row */}
        {exampleImages.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
            {exampleImages.map((img, i) => (
              <button key={img.id} type="button" onClick={() => setCurrentImg(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  i === currentImg ? 'border-pixio-500 shadow-md' : 'border-transparent opacity-70'
                }`}>
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Highlights */}
        <div className="space-y-3 mb-6">
          {highlights.map((h, i) => {
            const HIcon = h.icon;
            return (
              <div key={i} className="bg-white rounded-xl border border-ink-100 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center shrink-0">
                  <HIcon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink-800">{isEs ? h.titleEs : h.titleEn}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{isEs ? h.descEs : h.descEn}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => navigate('new-request', { categoryId })}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
        >
          <ClipboardList size={18} />
          {isEs ? 'Solicitar este Servicio' : 'Request this Service'}
        </button>
      </div>
    </div>
  );
}
