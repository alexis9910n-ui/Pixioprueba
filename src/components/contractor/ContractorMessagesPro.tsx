import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useContractorJobs, useMessages } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { formatDateTime, timeAgo } from '@/lib/format';
import { Spinner } from '@/components/ui';
import {
  MessageSquare, AlertTriangle, ChevronRight, Shield,
  FileText, Upload, ArrowLeft, Send,
} from 'lucide-react';
import type { DisputeClaim, JobRequest } from '@/lib/types';

export function ContractorMessagesPro() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { navigate } = useNavigate();
  const { profile } = useAuth();
  const { jobs, loading: jobsLoading } = useContractorJobs(profile?.id);
  const [tab, setTab] = useState<'messages' | 'disputes'>('messages');
  const [disputes, setDisputes] = useState<DisputeClaim[]>([]);
  const [loadingDisputes, setLoadingDisputes] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('dispute_claims')
          .select('*')
          .or(`filed_by.eq.${profile.id}`)
          .order('created_at', { ascending: false });
        if (data) setDisputes(data as DisputeClaim[]);
      } catch { /* ignore */ }
      setLoadingDisputes(false);
    })();
  }, [profile]);

  const activeJobs = jobs.filter((j) => j.status === 'in_progress');
  const loading = jobsLoading || loadingDisputes;

  return (
    <div className="animate-fade-in px-4 py-5">
      <h1 className="text-xl font-bold text-white mb-4">
        {isEs ? 'Comunicacion' : 'Communication'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'messages' as const, label: isEs ? 'Mensajes' : 'Messages', icon: <MessageSquare size={14} /> },
          { key: 'disputes' as const, label: isEs ? 'Disputas' : 'Disputes', icon: <AlertTriangle size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              tab === t.key
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-slate-400 bg-slate-800/60 border border-slate-700/40 hover:text-slate-300'
            }`}
          >
            {t.icon}
            {t.label}
            {t.key === 'disputes' && disputes.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                {disputes.filter((d) => d.status === 'open' || d.status === 'in_review').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="text-emerald-400" size={24} />
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare size={48} className="text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-1">
                {isEs ? 'Sin conversaciones' : 'No conversations'}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {isEs ? 'Los mensajes de tus proyectos activos apareceran aqui.' : 'Messages from active projects will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => navigate('messages', { projectId: job.id })}
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700/50 p-4 text-left hover:bg-slate-800 hover:border-emerald-500/30 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <MessageSquare size={18} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{job.title}</p>
                      <p className="text-[11px] text-slate-500">{timeAgo(job.created_at)}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disputes tab */}
      {tab === 'disputes' && (
        <div>
          {loadingDisputes ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="text-emerald-400" size={24} />
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield size={48} className="text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-300 mb-1">
                {isEs ? 'Sin disputas' : 'No disputes'}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {isEs ? 'No tienes disputas abiertas. Buen trabajo!' : 'You have no open disputes. Great work!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => {
                const statusColors: Record<string, string> = {
                  open: 'text-red-400 bg-red-500/15',
                  in_review: 'text-amber-400 bg-amber-500/15',
                  resolved_client: 'text-blue-400 bg-blue-500/15',
                  resolved_contractor: 'text-emerald-400 bg-emerald-500/15',
                  closed: 'text-slate-400 bg-slate-700',
                };
                return (
                  <div key={d.id} className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">{d.reason}</h3>
                      </div>
                      <span className={`inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 ${
                        statusColors[d.status] || 'text-slate-400 bg-slate-700'
                      }`}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 line-clamp-2">{d.details}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{formatDateTime(d.created_at)}</span>
                    </div>
                    {d.admin_notes && (
                      <div className="mt-2 rounded-lg bg-slate-900/60 p-2.5">
                        <p className="text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{isEs ? 'Nota del Admin:' : 'Admin Note:'}</span>{' '}
                          {d.admin_notes}
                        </p>
                      </div>
                    )}
                    {(d.status === 'open' || d.status === 'in_review') && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('messages', { projectId: d.job_id })}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                          <MessageSquare size={12} />
                          {isEs ? 'Mensajes' : 'Messages'}
                        </button>
                        <button
                          type="button"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                        >
                          <FileText size={12} />
                          {isEs ? 'Subir Evidencia' : 'Upload Evidence'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
