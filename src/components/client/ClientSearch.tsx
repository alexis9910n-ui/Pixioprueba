import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/lib/hooks';
import { getCategoryName, jobMatchesTrades, GENERAL_CONSTRUCTION } from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import { EmptyState, Spinner, Avatar } from '@/components/ui';
import { getIcon } from '@/lib/icons';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { Search, Users, MapPin, Star, Briefcase, Crown } from 'lucide-react';
import type { Profile, VerificationStatus, SubscriptionPlan } from '@/lib/types';

interface ContractorResult extends Profile {
  category_names?: string[];
}

function planRank(plan: SubscriptionPlan | string): number {
  if (plan === 'vip') return 0;
  if (plan === 'pro') return 1;
  return 2;
}

export function ClientSearch({ initialCategoryId }: { initialCategoryId?: string }) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { categories } = useCategories();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(initialCategoryId || '');
  const [contractors, setContractors] = useState<ContractorResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'contractor')
          .order('rating_avg', { ascending: false, nullsFirst: false });

        if (!cancelled && data) {
          const sorted = (data as ContractorResult[]).sort((a, b) => {
            const planDiff = planRank(a.subscription_plan) - planRank(b.subscription_plan);
            if (planDiff !== 0) return planDiff;
            return (b.rating_avg || 0) - (a.rating_avg || 0);
          });
          setContractors(sorted);
        }
      } catch { /* handled by retry wrapper */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isDefaultView = !search.trim() && !selectedCat;

  const filtered = contractors.filter((c) => {
    // Category / trade match (checks both new trades array and legacy specialties)
    if (selectedCat) {
      const matchesTrade = jobMatchesTrades(selectedCat, c.trades) && (c.trades?.length ?? 0) > 0;
      const matchesSpecialty = (c.specialties || []).includes(selectedCat);
      const matchesGeneral = (c.trades || []).includes(GENERAL_CONSTRUCTION);
      if (!matchesTrade && !matchesSpecialty && !matchesGeneral) return false;
    }

    // Text search by name / company
    if (search.trim()) {
      const q = search.toLowerCase();
      const hit =
        c.full_name.toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.bio || '').toLowerCase().includes(q);
      if (!hit) return false;
    }

    // Default view: feature only PRO/VIP/Enterprise or highly-rated verified pros
    if (isDefaultView) {
      const isPaid = c.subscription_plan === 'pro' || c.subscription_plan === 'vip';
      const isTopRated = (c.rating_avg || 0) >= 4.5;
      const isVerified = c.verification_status === 'verified';
      return isPaid || c.is_enterprise || (isVerified && isTopRated);
    }

    return true;
  });

  return (
    <div className="animate-fade-in px-4 py-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink-800 mb-1">
          {isEs ? 'Buscar Profesionales' : 'Find Professionals'}
        </h2>
        <p className="text-xs text-ink-500">
          {isDefaultView
            ? (isEs ? 'Profesionales destacados: PRO, VIP y mejor calificados' : 'Featured pros: PRO, VIP and top-rated')
            : (isEs ? 'Encuentra contratistas verificados por oficio' : 'Find verified contractors by trade')}
        </p>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder={isEs ? 'Buscar por nombre o empresa...' : 'Search by name or company...'}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
        <button
          type="button"
          onClick={() => setSelectedCat('')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !selectedCat ? 'bg-pixio-500 text-white' : 'bg-white border border-ink-200 text-ink-600'
          }`}
        >
          {t('categories.all')}
        </button>
        {categories.map((cat) => {
          const Icon = getIcon(cat.icon);
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCat === cat.id ? 'bg-pixio-500 text-white' : 'bg-white border border-ink-200 text-ink-600'
              }`}
            >
              <Icon size={12} />
              {getCategoryName(cat, i18n.language)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-pixio-500" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={isEs ? 'Sin resultados' : t('common.noResults')}
          description={isEs ? 'Prueba con otra categoria o termino de busqueda' : 'Try a different category or search term'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              categories={categories}
              lang={i18n.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractorCard({ contractor, categories, lang }: {
  contractor: ContractorResult;
  categories: { id: string; slug: string; icon: string; name_en: string; name_es: string }[];
  lang: string;
}) {
  const isEs = lang === 'es';
  const specialtyCats = (contractor.specialties || [])
    .map((sid) => categories.find((c) => c.id === sid))
    .filter(Boolean);

  const isPaid = contractor.subscription_plan === 'vip' || contractor.subscription_plan === 'pro';
  const planLabel = contractor.subscription_plan === 'vip' ? 'VIP' : 'PRO';
  const planColors = contractor.subscription_plan === 'vip'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-pixio-100 text-pixio-700';

  return (
    <div className={`card p-4 hover:shadow-card-hover transition-all ${isPaid ? 'ring-1 ring-amber-200' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar url={contractor.avatar_url} name={contractor.full_name} size={48} className="text-lg" />
          {isPaid && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
              <Crown size={10} className="text-white" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-semibold text-ink-800 text-sm truncate">{contractor.full_name}</p>
            <VerifiedBadge status={(contractor.verification_status || 'unverified') as VerificationStatus} size="sm" />
            {isPaid && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${planColors}`}>
                {planLabel}
              </span>
            )}
          </div>

          {contractor.company_name && (
            <p className="text-xs text-ink-500 truncate">{contractor.company_name}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {(contractor.rating_avg || 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-warning-600">
                <Star size={12} fill="currentColor" />
                {Number(contractor.rating_avg).toFixed(1)}
                <span className="text-ink-400">({contractor.rating_count})</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-ink-400">
              <Briefcase size={11} />
              {contractor.jobs_completed} {isEs ? 'trabajos' : 'jobs'}
            </span>
            {contractor.service_radius_km && (
              <span className="flex items-center gap-1 text-xs text-ink-400">
                <MapPin size={11} />
                {contractor.service_radius_km} km
              </span>
            )}
          </div>

          {specialtyCats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specialtyCats.slice(0, 4).map((cat) => {
                if (!cat) return null;
                const Icon = getIcon(cat.icon);
                return (
                  <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pixio-50 text-pixio-700 text-[10px] font-medium">
                    <Icon size={10} />
                    {getCategoryName(cat, lang)}
                  </span>
                );
              })}
              {specialtyCats.length > 4 && (
                <span className="text-[10px] text-ink-400 px-1.5 py-0.5">
                  +{specialtyCats.length - 4}
                </span>
              )}
            </div>
          )}

          {contractor.bio && (
            <p className="text-xs text-ink-500 mt-2 line-clamp-2">{contractor.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}
