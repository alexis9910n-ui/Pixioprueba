import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useQuotes, fetchJobById } from '@/lib/hooks';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Spinner, StarRating, EmptyState, Modal, Avatar } from '@/components/ui';
import { ArrowLeft, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import { EstimateBreakdownView } from '@/components/contractor/EstimateCreator';
import type { JobRequest, JobQuote, EstimateBreakdown, Profile, VerificationStatus } from '@/lib/types';

export function CompareBids({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { navigate, goBack } = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { quotes, loading, setQuotes } = useQuotes(projectId);
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const [hiring, setHiring] = useState<JobQuote | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [job, setJob] = useState<JobRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJobById(projectId).then((p) => {
      if (!cancelled) setJob(p);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleHire = async () => {
    if (!hiring || !profile || !job) return;
    if (!acceptTerms) {
      showToast(t('terms.mustAccept'), 'error');
      return;
    }
    setProcessing(true);

    await supabase.from('job_quotes').update({ status: 'accepted' }).eq('id', hiring.id);
    await supabase.from('job_quotes').update({ status: 'rejected' }).neq('id', hiring.id).eq('job_id', projectId);

    await supabase.from('job_requests').update({
      status: 'inspection_scheduled',
    }).eq('id', projectId);

    setProcessing(false);
    showToast(
      isEs
        ? 'Contratista seleccionado. Programa tu inspeccion de sitio.'
        : 'Contractor selected! Schedule your site inspection.',
      'success',
    );
    navigate('project-detail', { id: projectId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-pixio-500" size={24} />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={<ArrowLeft size={48} />}
        title={t('common.noResults')}
        description="No quotes yet for this job"
        action={<button type="button" onClick={goBack} className="btn-secondary">{t('common.back')}</button>}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="sticky top-14 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <h1 className="font-semibold text-ink-800">{t('client.compareBids.title')}</h1>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        <p className="text-xs text-ink-500 mb-4">{t('client.compareBids.maxBids')}</p>

        <div className="space-y-3">
          {quotes.map((quote) => {
            const contractor = (quote as JobQuote & { contractor?: Profile }).contractor;
            if (!contractor) return null;

            return (
              <div key={quote.id} className="card p-4 animate-slide-up">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar url={contractor.avatar_url} name={contractor.full_name} size={48} />

                    <div>
                      <p className="font-semibold text-ink-800 flex items-center gap-1.5">
                        {contractor.full_name}
                        <VerifiedBadge status={(contractor as Profile & { verification_status?: VerificationStatus }).verification_status || 'unverified'} size="sm" />
                      </p>
                      <StarRating rating={contractor.rating_avg || 0} />
                      <p className="text-xs text-ink-400 mt-0.5">{contractor.jobs_completed} {t('client.compareBids.jobs')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-pixio-700">{formatCurrency(quote.proposed_amount)}</p>
                  </div>
                </div>

                {/* Itemized breakdown toggle */}
                {quote.breakdown && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                      className="flex items-center gap-1 text-xs font-medium text-pixio-600 hover:text-pixio-700 mb-2 transition-colors"
                    >
                      {expandedQuote === quote.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isEs ? 'Ver desglose detallado' : 'View detailed breakdown'}
                    </button>
                    {expandedQuote === quote.id && (
                      <EstimateBreakdownView breakdown={quote.breakdown as EstimateBreakdown} isEs={isEs} />
                    )}
                  </div>
                )}

                {!quote.breakdown && quote.notes && (
                  <p className="text-sm text-ink-600 bg-ink-50 rounded-lg p-3 mb-3">{quote.notes}</p>
                )}

                {quote.estimated_days && (
                  <p className="text-xs text-ink-500 mb-3">ETA: {quote.estimated_days} {isEs ? 'dias' : 'days'}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('messages', { projectId, contractorId: contractor.id })}
                    className="btn-ghost flex-1 text-xs"
                  >
                    {t('client.compareBids.message')}
                  </button>
                  {quote.status === 'accepted' ? (
                    <div className="btn-secondary flex-1 text-xs opacity-50">
                      <Check size={14} /> {t('client.compareBids.hired')}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHiring(quote)}
                      className="btn-primary flex-1 text-xs"
                      disabled={job?.status !== 'open' && job?.status !== 'quote_limit_reached'}
                    >
                      {t('client.compareBids.hire')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hire confirmation modal */}
      <Modal
        open={!!hiring}
        onClose={() => setHiring(null)}
        title={t('client.compareBids.hire')}
      >
        {hiring && (
          <div className="space-y-4">
            <div className="rounded-xl bg-pixio-50 p-4">
              <p className="text-sm text-ink-600">
                {isEs ? 'Vas a seleccionar a' : 'You are about to select'}{' '}
                <strong>{(hiring as JobQuote & { contractor?: Profile }).contractor?.full_name}</strong>{' '}
                {isEs ? 'por' : 'for'}{' '}
                <strong className="text-pixio-700">{formatCurrency(hiring.proposed_amount)}</strong>
              </p>
              <p className="text-xs text-ink-500 mt-2">
                {isEs
                  ? 'Despues de seleccionar, programaras una inspeccion de sitio. El contratista enviara una cotizacion final tras la visita.'
                  : 'After selecting, you will schedule a site inspection. The contractor will submit a final quote after the visit.'}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-ink-50 p-3">
              <Shield size={18} className="text-accent-500 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-600">
                {isEs
                  ? 'Los fondos se depositaran en garantia solo despues de que apruebes la cotizacion final. Pixio cobra 15% de comision.'
                  : 'Funds will be held in escrow only after you approve the final quote. Pixio charges a 15% commission.'}
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded accent-pixio-500"
              />
              <span className="text-sm text-ink-600">{t('terms.accept')}</span>
            </label>

            <button
              type="button"
              onClick={handleHire}
              disabled={processing || !acceptTerms}
              className="btn-primary w-full"
            >
              {processing ? <Spinner size={18} /> : (isEs ? `Seleccionar — ${formatCurrency(hiring.proposed_amount)}` : `Select — ${formatCurrency(hiring.proposed_amount)}`)}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
