import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useMilestones, useExtraWork, fetchJobById, useCategories } from '@/lib/hooks';
import { getCategoryName } from '@/lib/categories';
import { formatCurrency, formatDateTime, hoursUntil } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Spinner, StatusBadge, EmptyState, Modal } from '@/components/ui';
import { ArrowLeft, MapPin, Camera, Shield, Clock, AlertTriangle, Plus, CheckCircle2, Image as ImageIcon, Star } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { PhotoGallery } from '@/components/shared/Lightbox';
import { AudioPlayer } from '@/components/shared/VoiceRecorder';
import { ReviewForm } from '@/components/shared/ReviewForm';
import { InspectionWorkflow } from '@/components/shared/InspectionWorkflow';
import type { JobRequest, Milestone, ExtraWorkRequest, Review } from '@/lib/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`;

export function ProjectDetail({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation();
  const { navigate, goBack } = useNavigate();
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const { categories } = useCategories();
  const { milestones, loading: mlLoading, setMilestones } = useMilestones(projectId);
  const { extraWork, setExtraWork } = useExtraWork(projectId);
  const [project, setProject] = useState<JobRequest | null>(null);
  const [disputeModal, setDisputeModal] = useState<Milestone | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [myReview, setMyReview] = useState<Review | null | undefined>(undefined);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJobById(projectId).then((p) => {
      if (!cancelled) setProject(p);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  // Determine the counterparty and fetch existing review
  const projectClientId = project?.client_id;
  const profileId = profile?.id;
  const projectStatus = project?.status;

  useEffect(() => {
    if (!projectClientId || !profileId) return;
    let cancelled = false;
    const isOwner = projectClientId === profileId;
    (async () => {
      if (isOwner) {
        const { data: quote } = await supabase
          .from('job_quotes')
          .select('contractor_id')
          .eq('job_id', projectId)
          .eq('status', 'accepted')
          .maybeSingle();
        if (!cancelled && quote) setCounterpartyId(quote.contractor_id);
      } else {
        if (!cancelled) setCounterpartyId(projectClientId);
      }
      const { data: existing } = await supabase
        .from('reviews')
        .select('*')
        .eq('project_id', projectId)
        .eq('reviewer_id', profileId)
        .maybeSingle();
      if (!cancelled) setMyReview(existing as Review | null);
    })();
    return () => { cancelled = true; };
  }, [projectClientId, profileId, projectId, projectStatus]);

  const isClient = project?.client_id === profile?.id;

  const callEdgeFunction = async (action: string, body: Record<string, unknown>) => {
    if (!session) throw new Error('Not authenticated');
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleDeposit = async (milestone: Milestone) => {
    try {
      const result = await callEdgeFunction('deposit-milestone', { milestone_id: milestone.id });
      // In production, this would redirect to Stripe Checkout with result.client_secret
      showToast('Payment initiated! (Stripe integration requires your API key)', 'success');
      setMilestones((prev) => prev.map((m) => m.id === milestone.id ? { ...m, status: 'deposited' } : m));
      if (project) {
        setProject({ ...project, status: 'in_progress' });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deposit', 'error');
    }
  };

  const handleOpenDispute = async () => {
    if (!disputeModal || !profile) return;
    if (!disputeReason || !disputeDesc) {
      showToast('Please fill all fields', 'error');
      return;
    }
    await supabase.from('disputes_and_claims').insert({
      job_id: projectId,
      filed_by: profile.id,
      reason: disputeReason,
      details: disputeDesc,
      status: 'open',
    });
    await supabase.from('milestones').update({ status: 'disputed' }).eq('id', disputeModal.id);
    setMilestones((prev) => prev.map((m) => m.id === disputeModal.id ? { ...m, status: 'disputed' } : m));
    setDisputeModal(null);
    setDisputeReason('');
    setDisputeDesc('');
    showToast(t('dispute.submitted'), 'success');
  };

  const handleApproveExtra = async (ew: ExtraWorkRequest) => {
    try {
      await supabase.from('extra_work_requests').update({ status: 'approved' }).eq('id', ew.id);
      setExtraWork((prev) => prev.map((e) => e.id === ew.id ? { ...e, status: 'approved' } : e));
      showToast('Extra work approved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to approve', 'error');
    }
  };

  const handleRejectExtra = async (ew: ExtraWorkRequest) => {
    await supabase.from('extra_work_requests').update({ status: 'rejected' }).eq('id', ew.id);
    setExtraWork((prev) => prev.map((e) => e.id === ew.id ? { ...e, status: 'rejected' } : e));
    showToast('Extra work rejected', 'info');
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-pixio-500" size={24} />
      </div>
    );
  }

  const cat = categories.find((c) => c.slug === project.category);
  const Icon = cat ? getIcon(cat.icon) : getIcon('Hammer');
  const statusKey = `client.projects.status.${project.status}`;

  return (
    <div className="animate-fade-in">
      <div className="sticky top-14 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <h1 className="font-semibold text-ink-800 line-clamp-1">{project.title}</h1>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-5">
        {/* Project header */}
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center">
              <Icon size={20} />
            </div>
            <div className="flex-1">
              {cat && <p className="text-xs text-ink-400">{getCategoryName(cat, i18n.language)}</p>}
              <StatusBadge status={project.status} label={t(statusKey)} />
            </div>
          </div>
          <p className="text-sm text-ink-600">{project.description}</p>
          <div className="flex items-center gap-1 text-xs text-ink-400 mt-2">
            <MapPin size={12} /> {project.zip_code}
          </div>

        </div>

        {/* Photos & Plans */}
        {project.image_urls && project.image_urls.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-ink-800 text-sm mb-3 flex items-center gap-2">
              <ImageIcon size={16} className="text-pixio-600" />
              {t('client.projects.photos') || 'Fotos y Planos'}
            </h3>
            <PhotoGallery urls={project.image_urls} />
          </div>
        )}

        {/* Voice note */}
        {project.audio_note_url && (
          <div className="card p-4">
            <h3 className="font-semibold text-ink-800 text-sm mb-3 flex items-center gap-2">
              <Camera size={16} className="text-pixio-600" />
              {t('client.projects.voiceNote') || 'Nota de Voz'}
            </h3>
            <AudioPlayer url={project.audio_note_url} />
          </div>
        )}

        {/* Milestones */}
        <div>
          <h2 className="font-semibold text-ink-800 mb-3 flex items-center gap-2">
            <Shield size={18} className="text-pixio-600" />
            {t('client.tracking.milestones')}
          </h2>
          {mlLoading ? (
            <div className="skeleton h-32" />
          ) : milestones.length === 0 ? (
            <p className="text-sm text-ink-500">No milestones yet. Hire a contractor to create milestones.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  isClient={isClient}
                  onDeposit={() => handleDeposit(m)}
                  onDispute={() => setDisputeModal(m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Change orders */}
        {extraWork.length > 0 && (
          <div>
            <h2 className="font-semibold text-ink-800 mb-3">{t('client.tracking.addChangeOrder')}</h2>
            <div className="space-y-3">
              {extraWork.map((ew) => (
                <div key={ew.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-ink-800 text-sm">{ew.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{ew.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pixio-700">{formatCurrency(ew.additional_amount)}</p>
                      <StatusBadge status={ew.status} label={ew.status.replace('_', ' ')} />
                    </div>
                  </div>
                  {ew.status === 'pending' && isClient && (
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => handleApproveExtra(ew)} className="btn-primary flex-1 text-xs">
                        {t('client.tracking.approveExtra')}
                      </button>
                      <button type="button" onClick={() => handleRejectExtra(ew)} className="btn-danger flex-1 text-xs">
                        {t('client.tracking.rejectExtra')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View bids link */}
        {(project.status === 'open' || project.status === 'quote_limit_reached') && (
          <button
            type="button"
            onClick={() => navigate('compare-bids', { id: projectId })}
            className="btn-secondary w-full"
          >
            {t('client.projects.viewBids')} ({project.quotes_count})
          </button>
        )}

        {/* Site Inspection Workflow */}
        {['inspection_scheduled', 'inspection_confirmed', 'final_quote_pending', 'final_quote_approved'].includes(project.status) && (
          <InspectionWorkflow
            job={project}
            isClient={isClient}
            contractorId={counterpartyId}
            onJobUpdate={(updated) => setProject(updated)}
          />
        )}

        {/* Review section - shown when project is completed */}
        {project.status === 'completed' && profile && counterpartyId && myReview !== undefined && (
          <div>
            <h2 className="font-semibold text-ink-800 mb-3 flex items-center gap-2">
              <Star size={18} className="text-warning-500" />
              {i18n.language === 'es' ? 'Calificacion' : 'Review'}
            </h2>
            <ReviewForm
              projectId={projectId}
              reviewerId={profile.id}
              revieweeId={counterpartyId}
              existingReview={myReview}
              onSubmitted={(r) => setMyReview(r)}
            />
          </div>
        )}
      </div>

      {/* Dispute modal */}
      <Modal
        open={!!disputeModal}
        onClose={() => setDisputeModal(null)}
        title={t('dispute.title')}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{t('dispute.reason')}</label>
            <input
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="input"
              placeholder="e.g. Incomplete work, quality issues..."
            />
          </div>
          <div>
            <label className="label">{t('dispute.describe')}</label>
            <textarea
              value={disputeDesc}
              onChange={(e) => setDisputeDesc(e.target.value)}
              className="input min-h-[100px]"
              placeholder="Provide detailed description..."
            />
          </div>
          <div className="rounded-xl bg-warning-50 p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-warning-600 shrink-0 mt-0.5" />
            <p className="text-xs text-warning-700">{t('dispute.inReview')}</p>
          </div>
          <button type="button" onClick={handleOpenDispute} className="btn-danger w-full">
            {t('dispute.submit')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MilestoneCard({
  milestone,
  isClient,
  onDeposit,
  onDispute,
}: {
  milestone: Milestone;
  isClient: boolean;
  onDeposit: () => void;
  onDispute: () => void;
}) {
  const { t } = useTranslation();
  const hoursLeft = milestone.release_scheduled_at ? hoursUntil(milestone.release_scheduled_at) : 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            milestone.status === 'released' ? 'bg-accent-500 text-white'
            : milestone.status === 'work_completed' || milestone.status === 'release_scheduled' ? 'bg-pixio-500 text-white'
            : milestone.status === 'deposited' ? 'bg-pixio-100 text-pixio-700'
            : milestone.status === 'disputed' ? 'bg-danger-500 text-white'
            : 'bg-ink-100 text-ink-400'
          }`}>
            {milestone.status === 'released' ? <CheckCircle2 size={14} /> : milestone.phase_number}
          </div>
          <div>
            <p className="font-semibold text-ink-800 text-sm">{t('client.tracking.phase', { n: milestone.phase_number })}</p>
            <p className="text-xs text-ink-400">{milestone.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-pixio-700">{formatCurrency(milestone.amount)}</p>
          <p className="text-xs text-ink-400">{milestone.percentage}%</p>
        </div>
      </div>

      <StatusBadge status={milestone.status} label={milestone.status.replace(/_/g, ' ')} />

      {/* Actions based on status */}
      {milestone.status === 'pending_deposit' && isClient && (
        <button type="button" onClick={onDeposit} className="btn-primary w-full mt-3 text-xs">
          {t('client.tracking.depositNow')} — {formatCurrency(milestone.amount)}
        </button>
      )}
      {milestone.status === 'pending_deposit' && !isClient && (
        <div className="mt-3 rounded-lg bg-warning-50 p-3 text-center">
          <p className="text-xs font-medium text-warning-600">{t('contractor.projects.phasePaused')}</p>
          <p className="text-[10px] text-warning-500 mt-0.5">{t('contractor.projects.phasePausedDesc')}</p>
        </div>
      )}
      {milestone.status === 'deposited' && (
        <div className="mt-3 rounded-lg bg-pixio-50 p-3 flex items-center gap-2">
          <Shield size={14} className="text-pixio-600" />
          <p className="text-xs text-pixio-600">{t('client.tracking.deposited')}</p>
        </div>
      )}
      {(milestone.status === 'work_completed' || milestone.status === 'release_scheduled') && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-accent-50 p-3 flex items-center gap-2">
            <Clock size={14} className="text-accent-600" />
            <p className="text-xs text-accent-600">{t('client.tracking.autoRelease', { hours: hoursLeft })}</p>
          </div>
          {isClient && (
            <button type="button" onClick={onDispute} className="btn-danger w-full text-xs">
              {t('client.tracking.openDispute')}
            </button>
          )}
        </div>
      )}
      {milestone.status === 'released' && (
        <div className="mt-3 rounded-lg bg-ink-100 p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-ink-500" />
          <p className="text-xs text-ink-500">{t('client.tracking.fundsReleased')}</p>
        </div>
      )}
      {milestone.status === 'disputed' && (
        <div className="mt-3 rounded-lg bg-danger-50 p-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-danger-600" />
          <p className="text-xs text-danger-600">{t('dispute.inReview')}</p>
        </div>
      )}
    </div>
  );
}
