import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useCategories } from '@/lib/hooks';
import { getCategoryName, groupCategories, getGroupLabel } from '@/lib/categories';
import { Search, Camera, Shield, CreditCard, Users, Star, ChevronRight, Crown, Briefcase } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { Avatar } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import type { Category, Profile, VerificationStatus } from '@/lib/types';

export function ClientHome() {
  const { t, i18n } = useTranslation();
  const { navigate } = useNavigate();
  const { categories } = useCategories();
  const isEs = i18n.language === 'es';

  const grouped = groupCategories(categories);
  const popular = categories.slice(0, 6);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="bg-gradient-to-br from-pixio-500 to-pixio-700 px-4 pt-8 pb-12 -mb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white leading-tight mb-2">
            {t('client.home.heroTitle')}
          </h1>
          <p className="text-pixio-100 text-sm mb-6">{t('client.home.heroSub')}</p>
          <button
            onClick={() => navigate('new-request')}
            className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Search size={20} className="text-pixio-500" />
            <span className="text-ink-400 text-sm text-left flex-1">{t('client.home.searchPlaceholder')}</span>
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto">
        {/* How it works */}
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-ink-800 mb-4">{t('client.home.howItWorks')}</h2>
          <div className="space-y-4">
            <StepCard icon={<Camera size={20} />} num="1" title={t('client.home.step1Title')} desc={t('client.home.step1Desc')} />
            <StepCard icon={<Users size={20} />} num="2" title={t('client.home.step2Title')} desc={t('client.home.step2Desc')} />
            <StepCard icon={<CreditCard size={20} />} num="3" title={t('client.home.step3Title')} desc={t('client.home.step3Desc')} />
          </div>
        </div>

        {/* Featured contractors */}
        <FeaturedContractors isEs={isEs} />

        {/* Popular categories */}
        <h2 className="font-semibold text-ink-800 mb-3">{t('client.home.popularCategories')}</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {popular.map((cat) => (
            <CategoryTile key={cat.id} cat={cat} lang={i18n.language} onClick={() => navigate('category-detail', { categoryId: cat.id })} />
          ))}
        </div>

        {/* All categories by group */}
        <h2 className="font-semibold text-ink-800 mb-3">{t('client.home.browseCategories')}</h2>
        <div className="space-y-5 mb-6">
          {Object.entries(grouped).map(([group, cats]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-ink-500 mb-2">{getGroupLabel(group, i18n.language)}</h3>
              <div className="grid grid-cols-4 gap-2">
                {cats.map((cat) => (
                  <CategoryTile key={cat.id} cat={cat} lang={i18n.language} small onClick={() => navigate('category-detail', { categoryId: cat.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="card p-4 mb-6 flex items-center gap-3">
          <Shield size={24} className="text-accent-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink-800">Escrow Protected</p>
            <p className="text-xs text-ink-500">Funds held safely until work is done</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedContractors({ isEs }: { isEs: boolean }) {
  const [contractors, setContractors] = useState<Profile[]>([]);
  const { navigate } = useNavigate();

  const fetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'contractor')
        .in('subscription_plan', ['pro', 'vip'])
        .order('rating_avg', { ascending: false, nullsFirst: false })
        .limit(8);
      if (data) setContractors(data as Profile[]);
    } catch { /* handled by retry wrapper */ }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (contractors.length === 0) return null;

  const planBadge = (plan: string) => {
    if (plan === 'vip') return { label: 'VIP', bg: 'bg-amber-100', text: 'text-amber-700' };
    return { label: 'PRO', bg: 'bg-pixio-100', text: 'text-pixio-700' };
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-ink-800 flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          {isEs ? 'Contratistas Populares' : 'Popular Contractors'}
        </h2>
        <button type="button" onClick={() => navigate('search')} className="text-xs text-pixio-600 font-medium flex items-center gap-0.5">
          {isEs ? 'Ver todos' : 'See all'}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {contractors.map((c) => {
          const badge = planBadge(c.subscription_plan);
          return (
            <div key={c.id} className="shrink-0 w-40 card p-3 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Avatar url={c.avatar_url} name={c.full_name} size={40} className="font-bold" />

                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
              <p className="font-semibold text-ink-800 text-xs truncate">{c.full_name}</p>
              {c.company_name && (
                <p className="text-[10px] text-ink-400 truncate">{c.company_name}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                {(c.rating_avg || 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-warning-600">
                    <Star size={10} fill="currentColor" />
                    {Number(c.rating_avg).toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] text-ink-400 flex items-center gap-0.5">
                  <Briefcase size={9} />
                  {c.jobs_completed}
                </span>
              </div>
              <VerifiedBadge status={(c.verification_status || 'unverified') as VerificationStatus} size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({ icon, num, title, desc }: { icon: React.ReactNode; num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center shrink-0 relative">
        {icon}
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pixio-500 text-white text-xs font-bold flex items-center justify-center">
          {num}
        </span>
      </div>
      <div>
        <p className="font-medium text-ink-800 text-sm">{title}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </div>
  );
}

function CategoryTile({
  cat,
  lang,
  small,
  onClick,
}: {
  cat: Category;
  lang: string;
  small?: boolean;
  onClick: () => void;
}) {
  const Icon = getIcon(cat.icon);
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 ${small ? 'p-2' : 'p-3'} rounded-xl bg-white border border-ink-100 hover:border-pixio-300 hover:shadow-card-hover transition-all text-center`}
    >
      <div className={`${small ? 'w-9 h-9' : 'w-12 h-12'} rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center`}>
        <Icon size={small ? 18 : 22} />
      </div>
      <span className={`${small ? 'text-[10px]' : 'text-xs'} font-medium text-ink-700 leading-tight line-clamp-2`}>
        {getCategoryName(cat, lang)}
      </span>
    </button>
  );
}
