import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VerificationStatus } from '@/lib/types';

interface VerifiedBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function VerifiedBadge({ status, size = 'sm', showLabel = false }: VerifiedBadgeProps) {
  const { t } = useTranslation();

  if (status === 'unverified' && !showLabel) return null;

  const iconSizes = { sm: 14, md: 16, lg: 20 };
  const iconSize = iconSizes[size];

  if (status === 'verified') {
    return (
      <span className={`inline-flex items-center gap-1 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        <ShieldCheck size={iconSize} className="text-blue-500" />
        {showLabel && <span className="font-medium text-blue-600">{t('verification.verified')}</span>}
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        <Clock size={iconSize} className="text-warning-500" />
        {showLabel && <span className="font-medium text-warning-600">{t('verification.pending')}</span>}
      </span>
    );
  }

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
        <ShieldAlert size={iconSize} className="text-ink-400" />
        <span className="font-medium text-ink-500">{t('verification.unverified')}</span>
      </span>
    );
  }

  return null;
}

export function VerificationGate({ status, children, fallback }: {
  status: VerificationStatus;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { t } = useTranslation();

  if (status === 'verified') return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-xl border-2 border-dashed border-warning-300 bg-warning-50 p-4 text-center">
      <ShieldAlert size={28} className="text-warning-500 mx-auto mb-2" />
      <p className="text-sm font-semibold text-ink-700 mb-1">{t('verification.requiredTitle')}</p>
      <p className="text-xs text-ink-500">{t('verification.requiredDesc')}</p>
    </div>
  );
}
