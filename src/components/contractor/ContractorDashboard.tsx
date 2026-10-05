import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useContractorJobs, useWalletTransactions, useReviews } from '@/lib/hooks';
import { formatCurrency } from '@/lib/format';
import { Spinner } from '@/components/ui';
import {
  TrendingUp, Shield, Briefcase, Star, ChevronRight,
  ShieldAlert, Zap, Clock, CheckCircle2, DollarSign,
} from 'lucide-react';

export function ContractorDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { profile } = useAuth();
  const { jobs, loading: jobsLoading } = useContractorJobs(profile?.id);
  const { transactions, loading: txLoading } = useWalletTransactions(profile?.id);
  const { reviews } = useReviews(profile?.id);

  const inspectionJobs = jobs.filter((j) =>
    ['inspection_scheduled', 'inspection_confirmed', 'final_quote_pending', 'final_quote_approved'].includes(j.status),
  );
  const inProgressJobs = jobs.filter((j) => j.status === 'in_progress');
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const inEscrow = transactions
    .filter((tx) => tx.type === 'escrow_hold')
    .reduce((sum, tx) => sum + tx.gross_amount, 0);
  const available = transactions
    .filter((tx) => tx.type === 'milestone_release' || tx.type === 'change_order_release')
    .reduce((sum, tx) => sum + tx.net_amount, 0);
  const totalEarned = transactions
    .filter((tx) => tx.type === 'milestone_release' || tx.type === 'change_order_release')
    .reduce((sum, tx) => sum + tx.gross_amount, 0);

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : profile?.rating_avg || 0;

  const loading = jobsLoading || txLoading;

  return (
    <div className="animate-fade-in px-4 py-5">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-5 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-slate-400 text-sm">
              {isEs ? 'Bienvenido,' : 'Welcome,'}
            </p>
            <h1 className="text-xl font-bold text-white">
              {profile?.full_name || 'Contractor'}
            </h1>
            {profile?.company_name && (
              <p className="text-emerald-400 text-sm mt-0.5">{profile.company_name}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-lg px-2.5 py-1.5">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Pro</span>
          </div>
        </div>

        {profile?.verification_status !== 'verified' && (
          <button
            type="button"
            onClick={() => onNavigate('verification')}
            className="w-full rounded-xl bg-amber-500/15 border border-amber-500/25 p-3 flex items-center gap-3 mt-2 hover:bg-amber-500/20 transition-colors"
          >
            <ShieldAlert size={18} className="text-amber-400 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-amber-300">
                {isEs ? 'Verificacion pendiente' : 'Verification pending'}
              </p>
              <p className="text-[11px] text-amber-400/70">
                {isEs ? 'Completa tu verificacion para enviar cotizaciones' : 'Complete verification to submit quotes'}
              </p>
            </div>
            <ChevronRight size={16} className="text-amber-400/50" />
          </button>
        )}
      </div>

      {/* Financial overview cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => onNavigate('wallet')}
          className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4 text-left hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
            {isEs ? 'Disponible' : 'Available'}
          </p>
          {loading ? (
            <div className="h-7 w-20 rounded bg-slate-700 animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(available)}</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate('wallet')}
          className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4 text-left hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Shield size={16} className="text-amber-400" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">
            {isEs ? 'En Garantia' : 'In Escrow'}
          </p>
          {loading ? (
            <div className="h-7 w-20 rounded bg-slate-700 animate-pulse" />
          ) : (
            <p className="text-xl font-bold text-amber-400">{formatCurrency(inEscrow)}</p>
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 text-center">
          <Briefcase size={16} className="text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{loading ? '-' : inProgressJobs.length}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isEs ? 'Activos' : 'Active'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 text-center">
          <CheckCircle2 size={16} className="text-slate-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{loading ? '-' : completedJobs.length}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isEs ? 'Completados' : 'Completed'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 text-center">
          <Star size={16} className="text-amber-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{avgRating > 0 ? avgRating.toFixed(1) : '--'}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isEs ? 'Calificacion' : 'Rating'}
          </p>
        </div>
      </div>

      {/* Total earned */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-emerald-400/70 uppercase tracking-wide font-medium">
            {isEs ? 'Total Ganado' : 'Total Earned'}
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : formatCurrency(totalEarned)}
          </p>
        </div>
        <DollarSign size={32} className="text-emerald-500/20" />
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {isEs ? 'Acciones Rapidas' : 'Quick Actions'}
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => onNavigate('feed')}
          className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-left hover:bg-emerald-500/15 transition-colors group"
        >
          <Zap size={20} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold text-white">
            {isEs ? 'Buscar Trabajos' : 'Find Jobs'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Nuevas solicitudes disponibles' : 'New requests available'}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('projects')}
          className="rounded-xl bg-slate-800/80 border border-slate-700/50 p-4 text-left hover:bg-slate-800 transition-colors group"
        >
          <Briefcase size={20} className="text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-semibold text-white">
            {isEs ? 'Mis Proyectos' : 'My Projects'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isEs ? 'Gestionar proyectos activos' : 'Manage active projects'}
          </p>
        </button>
      </div>

      {/* Inspection / pending quote projects */}
      {inspectionJobs.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              {isEs ? 'Inspecciones Pendientes' : 'Pending Inspections'}
            </h2>
          </div>
          <div className="space-y-2 mb-5">
            {inspectionJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onNavigate('projects')}
                className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-left hover:bg-amber-500/15 transition-colors flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{job.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/15 rounded-full px-2 py-0.5">
                      <Clock size={10} />
                      {job.status === 'inspection_scheduled' ? (isEs ? 'Agendar inspeccion' : 'Schedule inspection')
                        : job.status === 'inspection_confirmed' ? (isEs ? 'Inspeccion confirmada' : 'Inspection confirmed')
                        : job.status === 'final_quote_pending' ? (isEs ? 'Cotizacion pendiente' : 'Quote pending')
                        : (isEs ? 'Aprobacion pendiente' : 'Approval pending')}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Active projects preview */}
      {inProgressJobs.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              {isEs ? 'Proyectos en Curso' : 'Active Projects'}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs text-emerald-400 font-medium hover:underline"
            >
              {isEs ? 'Ver todos' : 'See all'}
            </button>
          </div>
          <div className="space-y-2">
            {inProgressJobs.slice(0, 3).map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onNavigate('projects')}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/50 p-4 text-left hover:bg-slate-800 transition-colors flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{job.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/15 rounded-full px-2 py-0.5">
                      <Clock size={10} />
                      {isEs ? 'En progreso' : 'In progress'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
