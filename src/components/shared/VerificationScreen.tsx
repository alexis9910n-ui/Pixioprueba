import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Spinner } from '@/components/ui';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import {
  ShieldCheck, ScanFace, CreditCard, ArrowLeft, ExternalLink,
  CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-identity`;

export function VerificationScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { profile, session, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const status = profile?.verification_status || 'unverified';

  const handleStart = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`${EDGE_URL}?action=create-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start verification');
      if (data.url) {
        await refreshProfile();
        window.open(data.url, '_blank', 'noopener,noreferrer');
        showToast(t('verification.redirecting'), 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Verification failed', 'error');
    }
    setLoading(false);
  };

  const handleCheck = async () => {
    if (!session) return;
    setChecking(true);
    try {
      const res = await fetch(`${EDGE_URL}?action=check-status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      await refreshProfile();
      if (data.status === 'verified') showToast(t('verification.success'), 'success');
      else if (data.status === 'pending') showToast(t('verification.stillPending'), 'info');
      else showToast(t('verification.notVerified'), 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Check failed', 'error');
    }
    setChecking(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="sticky top-14 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <h1 className="font-semibold text-ink-800">{t('verification.title')}</h1>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Status card */}
        <div className={`rounded-2xl p-5 ${
          status === 'verified' ? 'bg-blue-50 border border-blue-200'
          : status === 'pending' ? 'bg-warning-50 border border-warning-200'
          : 'bg-ink-50 border border-ink-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {status === 'verified' ? (
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-blue-600" />
              </div>
            ) : status === 'pending' ? (
              <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
                <Clock size={24} className="text-warning-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-ink-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-ink-500" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink-800">
                  {status === 'verified' ? t('verification.verifiedTitle')
                  : status === 'pending' ? t('verification.pendingTitle')
                  : t('verification.unverifiedTitle')}
                </h3>
                <VerifiedBadge status={status} size="md" />
              </div>
              <p className="text-sm text-ink-500">
                {status === 'verified' ? t('verification.verifiedDesc')
                : status === 'pending' ? t('verification.pendingDesc')
                : t('verification.unverifiedDesc')}
              </p>
            </div>
          </div>
          {status === 'pending' && (
            <button type="button" onClick={handleCheck} disabled={checking} className="btn-secondary w-full text-sm mt-2">
              {checking ? <Spinner size={16} /> : t('verification.checkStatus')}
            </button>
          )}
        </div>

        {status !== 'verified' && (
          <>
            <div>
              <h3 className="font-semibold text-ink-800 mb-3">{t('verification.benefitsTitle')}</h3>
              <div className="space-y-3">
                {[
                  { icon: <ShieldCheck size={20} />, title: t('verification.benefit1Title'), desc: t('verification.benefit1Desc') },
                  { icon: <CreditCard size={20} />, title: t('verification.benefit2Title'), desc: t('verification.benefit2Desc') },
                  { icon: <ScanFace size={20} />, title: t('verification.benefit3Title'), desc: t('verification.benefit3Desc') },
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center shrink-0">{b.icon}</div>
                    <div>
                      <p className="font-medium text-ink-700 text-sm">{b.title}</p>
                      <p className="text-xs text-ink-500">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ink-50 rounded-xl p-4">
              <h4 className="font-semibold text-ink-700 text-sm mb-2">{t('verification.howItWorks')}</h4>
              <ol className="space-y-2 text-sm text-ink-600">
                {[t('verification.step1'), t('verification.step2'), t('verification.step3')].map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pixio-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <button type="button" onClick={handleStart} disabled={loading || status === 'pending'} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner size={18} /> : (
                <>
                  <ExternalLink size={18} />
                  {status === 'pending' ? t('verification.alreadyStarted') : t('verification.startVerification')}
                </>
              )}
            </button>
            <p className="text-xs text-ink-400 text-center">{t('verification.poweredBy')}</p>
          </>
        )}

        {status === 'verified' && profile?.verified_at && (
          <p className="text-xs text-ink-400 text-center">
            {t('verification.verifiedOn', { date: new Date(profile.verified_at).toLocaleDateString() })}
          </p>
        )}
      </div>
    </div>
  );
}
