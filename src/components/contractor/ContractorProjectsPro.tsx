import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useContractorJobs, useMilestones, useExtraWork } from '@/lib/hooks';
import { formatCurrency, hoursUntil } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Spinner, StatusBadge, Modal } from '@/components/ui';
import {
  Briefcase, Camera, Clock, Pause, CheckCircle2, Plus,
  MessageSquare, ChevronRight, AlertTriangle, Upload,
} from 'lucide-react';
import type { JobRequest, Milestone } from '@/lib/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`;

export function ContractorProjectsPro() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { navigate } = useNavigate();
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const { jobs, loading } = useContractorJobs(profile?.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [extraModal, setExtraModal] = useState<JobRequest | null>(null);
  const [extraTitle, setExtraTitle] = useState('');
  const [extraReason, setExtraReason] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [proofModal, setProofModal] = useState<Milestone | null>(null);

  const activeJobs = jobs.filter((j) => j.status === 'in_progress');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const displayJobs = tab === 'active' ? activeJobs : completedJobs;

  const callEdge = async (action: string, body: Record<string, unknown>) => {
    if (!session) throw new Error('Not authenticated');
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=${action}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleCompleteMilestone = async (milestone: Milestone) => {
    try {
      await callEdge('complete-milestone', { milestone_id: milestone.id, proof_photos: [] });
      showToast(isEs ? 'Fase marcada como completada' : 'Phase marked complete', 'success');
      setProofModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleSubmitExtra = async () => {
    if (!extraModal || !profile) return;
    if (!extraTitle || !extraReason || !extraAmount) {
      showToast(isEs ? 'Llena todos los campos' : 'Fill all fields', 'error');
      return;
    }
    await supabase.from('extra_work_requests').insert({
      job_id: extraModal.id,
      requested_by: profile.id,
      title: extraTitle,
      description: extraReason,
      additional_amount: parseFloat(extraAmount),
      status: 'pending',
    });
    setExtraModal(null);
    setExtraTitle('');
    setExtraReason('');
    setExtraAmount('');
    showToast(isEs ? 'Solicitud enviada' : 'Request submitted', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-emerald-400" size={24} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-5">
      <h1 className="text-xl font-bold text-white mb-4">
        {isEs ? 'Mis Proyectos' : 'My Projects'}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'active' as const, label: isEs ? 'En Progreso' : 'In Progress', count: activeJobs.length },
          { key: 'completed' as const, label: isEs ? 'Completados' : 'Completed', count: completedJobs.length },
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
            {t.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {displayJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase size={48} className="text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-1">
            {tab === 'active'
              ? (isEs ? 'Sin proyectos activos' : 'No active projects')
              : (isEs ? 'Sin proyectos completados' : 'No completed projects')}
          </h3>
          <p className="text-sm text-slate-500 max-w-xs">
            {tab === 'active'
              ? (isEs ? 'Gana licitaciones para ver proyectos aqui.' : 'Win bids to see projects here.')
              : (isEs ? 'Los proyectos terminados apareceran aqui.' : 'Finished projects will appear here.')}
          </p>
          {tab === 'active' && (
            <button type="button" onClick={() => navigate('feed')} className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
              {isEs ? 'Buscar Trabajos' : 'Find Jobs'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayJobs.map((job) => (
            <div key={job.id} className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                className="w-full p-4 text-left hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm truncate">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${
                        job.status === 'completed'
                          ? 'text-slate-300 bg-slate-700'
                          : 'text-emerald-400 bg-emerald-500/15'
                      }`}>
                        {job.status === 'completed' ? (
                          <><CheckCircle2 size={10} /> {isEs ? 'Completado' : 'Completed'}</>
                        ) : (
                          <><Clock size={10} /> {isEs ? 'En progreso' : 'In progress'}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate('messages', { projectId: job.id }); }}
                        className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                      >
                        <MessageSquare size={14} className="text-slate-300" />
                      </button>
                    )}
                    <ChevronRight size={16} className={`text-slate-600 transition-transform ${expandedId === job.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </button>

              {expandedId === job.id && (
                <MilestonesPro
                  projectId={job.id}
                  isCompleted={job.status === 'completed'}
                  onComplete={(m) => setProofModal(m)}
                  onAddExtra={() => setExtraModal(job)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Proof modal */}
      <Modal open={!!proofModal} onClose={() => setProofModal(null)} title={isEs ? 'Subir Prueba de Trabajo' : 'Upload Work Proof'}>
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm text-ink-600">
              {isEs ? 'Sube fotos del trabajo completado para' : 'Upload photos of completed work for'}{' '}
              <strong>{isEs ? 'Fase' : 'Phase'} {proofModal?.phase_number}</strong> ({formatCurrency(proofModal?.amount || 0)})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-20 rounded-xl border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-400">
                <Camera size={20} />
                <span className="text-[10px] mt-1">{isEs ? 'Foto' : 'Photo'} {i}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 flex items-start gap-2">
            <Clock size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700">
              {isEs
                ? 'Al marcar como completada, se inicia un temporizador de 48 horas. Si el cliente no abre una disputa, los fondos se liberan automaticamente.'
                : 'After marking complete, a 48-hour timer starts. If the client does not open a dispute, funds auto-release.'}
            </p>
          </div>
          <button type="button" onClick={() => proofModal && handleCompleteMilestone(proofModal)} className="btn-primary w-full">
            <Upload size={16} />
            {isEs ? 'Solicitar Liberacion de Fondos' : 'Request Milestone Release'}
          </button>
        </div>
      </Modal>

      {/* Extra work modal */}
      <Modal open={!!extraModal} onClose={() => setExtraModal(null)} title={isEs ? 'Trabajo Extra' : 'Extra Work'}>
        <div className="space-y-4">
          <div>
            <label className="label">{isEs ? 'Titulo' : 'Title'}</label>
            <input value={extraTitle} onChange={(e) => setExtraTitle(e.target.value)} className="input" placeholder={isEs ? 'Ej: Seccion de tablaroca' : 'e.g. Extra drywall section'} />
          </div>
          <div>
            <label className="label">{isEs ? 'Razon' : 'Reason'}</label>
            <textarea value={extraReason} onChange={(e) => setExtraReason(e.target.value)} className="input min-h-[80px]" placeholder={isEs ? 'Explica por que es necesario...' : 'Explain why this is needed...'} />
          </div>
          <div>
            <label className="label">{isEs ? 'Monto Adicional' : 'Additional Amount'}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 font-semibold">$</span>
              <input type="number" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} className="input pl-7" placeholder="0" />
            </div>
          </div>
          <button type="button" onClick={handleSubmitExtra} className="btn-primary w-full">
            {isEs ? 'Enviar Solicitud' : 'Submit Request'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MilestonesPro({
  projectId,
  isCompleted,
  onComplete,
  onAddExtra,
}: {
  projectId: string;
  isCompleted: boolean;
  onComplete: (m: Milestone) => void;
  onAddExtra: () => void;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { milestones, loading } = useMilestones(projectId);
  const { extraWork } = useExtraWork(projectId);

  if (loading) return <div className="p-4"><div className="h-24 rounded-xl bg-slate-900/60 animate-pulse" /></div>;

  const totalAmount = milestones.reduce((s, m) => s + m.amount, 0);
  const releasedAmount = milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0);

  return (
    <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
      {/* Progress summary */}
      {totalAmount > 0 && (
        <div className="rounded-xl bg-slate-900/60 p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-400 font-medium">
              {isEs ? 'Progreso de Pago' : 'Payment Progress'}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {formatCurrency(releasedAmount)} / {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${totalAmount > 0 ? (releasedAmount / totalAmount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {milestones.map((m) => {
        const hoursLeft = m.release_scheduled_at ? hoursUntil(m.release_scheduled_at) : 0;
        return (
          <div key={m.id} className="rounded-xl bg-slate-900/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-200">
                {isEs ? 'Fase' : 'Phase'} {m.phase_number}: {m.label}
              </span>
              <span className="text-sm font-semibold text-emerald-400">{formatCurrency(m.amount)}</span>
            </div>
            <span className={`inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 ${
              m.status === 'released' ? 'text-emerald-400 bg-emerald-500/15'
              : m.status === 'deposited' ? 'text-blue-400 bg-blue-500/15'
              : m.status === 'work_completed' || m.status === 'release_scheduled' ? 'text-amber-400 bg-amber-500/15'
              : m.status === 'disputed' ? 'text-red-400 bg-red-500/15'
              : 'text-slate-400 bg-slate-700'
            }`}>
              {m.status.replace(/_/g, ' ')}
            </span>

            {m.status === 'deposited' && !isCompleted && (
              <button
                type="button"
                onClick={() => onComplete(m)}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
              >
                <Upload size={14} />
                {isEs ? 'Marcar Completa y Solicitar Pago' : 'Mark Complete & Request Payment'}
              </button>
            )}
            {(m.status === 'work_completed' || m.status === 'release_scheduled') && (
              <div className="mt-2 rounded-lg bg-amber-500/10 p-2 flex items-center gap-2">
                <Clock size={12} className="text-amber-400" />
                <span className="text-xs text-amber-400">
                  {isEs ? `Liberacion en ~${hoursLeft}h` : `Release in ~${hoursLeft}h`}
                </span>
              </div>
            )}
            {m.status === 'released' && (
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-xs text-slate-400">{isEs ? 'Fondos liberados' : 'Funds released'}</span>
              </div>
            )}
            {m.status === 'pending_deposit' && (
              <div className="mt-2 rounded-lg bg-slate-800 p-2 flex items-start gap-2">
                <Pause size={12} className="text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500">
                  {isEs ? 'Esperando deposito del cliente' : 'Waiting for client deposit'}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {extraWork.map((ew) => (
        <div key={ew.id} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-300">{ew.title}</span>
            <span className="text-sm font-semibold text-emerald-400">{formatCurrency(ew.additional_amount)}</span>
          </div>
          <StatusBadge status={ew.status} label={ew.status.replace(/_/g, ' ')} />
        </div>
      ))}

      {!isCompleted && (
        <button
          type="button"
          onClick={onAddExtra}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 bg-slate-900/40 border border-slate-700/30 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <Plus size={14} /> {isEs ? 'Solicitar Trabajo Extra' : 'Request Extra Work'}
        </button>
      )}

      {/* Historical cost breakdown for completed */}
      {isCompleted && milestones.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700/30 p-3 mt-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {isEs ? 'Resumen de Costos' : 'Cost Summary'}
          </h4>
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{m.label} ({m.percentage}%)</span>
                <span className="font-medium text-white">{formatCurrency(m.amount)}</span>
              </div>
            ))}
            {extraWork.filter((e) => e.status === 'approved').map((ew) => (
              <div key={ew.id} className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">{ew.title} (extra)</span>
                <span className="font-medium text-emerald-400">+{formatCurrency(ew.additional_amount)}</span>
              </div>
            ))}
            <div className="border-t border-slate-700/50 pt-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-200">{isEs ? 'Total Proyecto' : 'Project Total'}</span>
              <span className="font-bold text-white">
                {formatCurrency(
                  milestones.reduce((s, m) => s + m.amount, 0)
                  + extraWork.filter((e) => e.status === 'approved').reduce((s, e) => s + e.additional_amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
