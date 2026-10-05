import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useOpenJobs, useCategories } from '@/lib/hooks';
import { getCategoryName, jobMatchesTrades, GENERAL_CONSTRUCTION } from '@/lib/categories';
import { timeAgo } from '@/lib/format';
import { EmptyState, Spinner } from '@/components/ui';
import { getIcon } from '@/lib/icons';
import { Search, MapPin, Clock, Users, Sliders, ShieldAlert, AlertTriangle, Zap } from 'lucide-react';
import type { JobRequest } from '@/lib/types';

export function ContractorFeedPro() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { navigate } = useNavigate();
  const { profile } = useAuth();
  const { categories } = useCategories();
  const [selectedCat, setSelectedCat] = useState('');
  const [radius, setRadius] = useState(20);
  const { jobs, loading } = useOpenJobs(selectedCat || undefined);

  const myTrades = profile?.trades?.length ? profile.trades : (profile?.specialties ?? []);
  const handlesAll = myTrades.length === 0 || myTrades.includes(GENERAL_CONSTRUCTION);

  const availableCats = handlesAll
    ? categories
    : categories.filter((c) => myTrades.includes(c.slug));

  // Route jobs: General Construction sees everything, others only their trades.
  const visibleJobs = selectedCat
    ? jobs
    : jobs.filter((j) => jobMatchesTrades(j.category, myTrades));

  return (
    <div className="animate-fade-in px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">
          {isEs ? 'Trabajos Disponibles' : 'Available Jobs'}
        </h1>
        <span className="text-xs text-slate-400">{visibleJobs.length} {isEs ? 'resultados' : 'results'}</span>
      </div>

      {profile?.verification_status !== 'verified' && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 mb-4 flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {profile?.verification_status === 'pending'
                ? (isEs ? 'Verificacion en proceso' : 'Verification in progress')
                : (isEs ? 'Cuenta no verificada' : 'Account not verified')}
            </p>
            <p className="text-xs text-amber-400/70 mt-1">
              {isEs ? 'No podras enviar cotizaciones hasta completar la verificacion.' : 'You cannot submit quotes until verification is complete.'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 pl-10 pr-4 py-3 text-sm text-white appearance-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
          >
            <option value="">{isEs ? 'Todas las categorias' : 'All categories'}</option>
            {availableCats.map((cat) => (
              <option key={cat.id} value={cat.id}>{getCategoryName(cat, i18n.language)}</option>
            ))}
          </select>
        </div>
        <div className="relative w-28">
          <Sliders size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-600 bg-slate-900 pl-10 pr-4 py-3 text-sm text-white appearance-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
          >
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mb-3">
        {isEs ? `Dentro de ${radius} km` : `Within ${radius} km`}
      </p>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-slate-800/60 animate-pulse" />)}</div>
      ) : visibleJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={48} className="text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">{isEs ? 'Sin trabajos disponibles' : 'No jobs available'}</h3>
          <p className="text-sm text-slate-500 max-w-xs">{isEs ? 'Revisa mas tarde para nuevas solicitudes.' : 'Check back later for new requests.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleJobs.map((job) => (
            <FeedCardPro key={job.id} job={job} onBid={() => navigate('estimate', { id: job.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedCardPro({ job, onBid }: { job: JobRequest; onBid: () => void }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { categories } = useCategories();
  const cat = categories.find((c) => c.slug === job.category);
  const Icon = cat ? getIcon(cat.icon) : getIcon('Hammer');
  const slotsLeft = 5 - job.quotes_count;
  const full = slotsLeft <= 0;

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4 hover:border-emerald-500/30 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm line-clamp-1">{job.title}</h3>
          {cat && <p className="text-xs text-slate-400">{getCategoryName(cat, i18n.language)}</p>}
          <p className="text-xs text-slate-300 line-clamp-2 mt-1">{job.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1"><MapPin size={11} />{job.zip_code}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{timeAgo(job.created_at)}</span>
        <span className={`flex items-center gap-1 ${full ? 'text-red-400' : slotsLeft <= 2 ? 'text-amber-400' : ''}`}>
          <Users size={11} />
          {full ? (isEs ? 'Lleno' : 'Full') : `${slotsLeft} ${isEs ? 'espacios' : 'slots'}`}
        </span>
      </div>

      {full ? (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300 font-medium">
            {isEs ? 'Limite de cotizaciones alcanzado.' : 'Quote limit reached.'}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onBid}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
        >
          <Zap size={16} />
          {isEs ? 'Enviar Cotizacion' : 'Send Quote'}
        </button>
      )}
    </div>
  );
}
