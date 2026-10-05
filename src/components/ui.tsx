import { useState, useEffect, type ReactNode } from 'react';
import { Loader2, Star, MapPin, Clock, CheckCircle2, AlertCircle, X, ImageOff } from 'lucide-react';

export function Spinner({ className = '', size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

function initialsFrom(name?: string | null) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Circular avatar that renders the given URL and gracefully falls back to
 * initials (or a user glyph) when the URL is empty, invalid, or fails to load.
 */
export function Avatar({
  url,
  name,
  size = 40,
  className = '',
  ring,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  ring?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);

  const showImg = url && url.trim() !== '' && !failed;
  const initials = initialsFrom(name);

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-pixio-100 text-pixio-700 font-semibold shrink-0 ${ring || ''} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4) }}
    >
      {showImg ? (
        <img
          src={url!}
          alt={name || ''}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <ImageOff size={Math.round(size * 0.4)} className="text-pixio-400" />
      )}
    </div>
  );
}

/**
 * Rectangular image with a graceful placeholder when the source is missing
 * or fails to load. Use for job photos, galleries, and previews.
 */
export function SafeImage({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const ok = src && src.trim() !== '' && !failed;
  if (ok) {
    return (
      <img
        src={src!}
        alt={alt}
        onError={() => setFailed(true)}
        className={className}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`flex items-center justify-center bg-ink-100 text-ink-300 ${className} ${fallbackClassName}`}>
      <ImageOff size={28} />
    </div>
  );
}

export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'fill-warning-400 text-warning-400' : 'text-ink-300'}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-ink-500">{rating.toFixed(1)}</span>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    open: 'bg-pixio-50 text-pixio-700',
    awarded: 'bg-pixio-50 text-pixio-700',
    in_progress: 'bg-accent-50 text-accent-600',
    awaiting_funds: 'bg-warning-50 text-warning-600',
    completed: 'bg-ink-100 text-ink-600',
    cancelled: 'bg-danger-50 text-danger-600',
    pending_deposit: 'bg-warning-50 text-warning-600',
    deposited: 'bg-pixio-50 text-pixio-700',
    work_completed: 'bg-accent-50 text-accent-600',
    release_scheduled: 'bg-accent-50 text-accent-600',
    released: 'bg-ink-100 text-ink-600',
    disputed: 'bg-danger-50 text-danger-600',
    pending_approval: 'bg-warning-50 text-warning-600',
    approved: 'bg-accent-50 text-accent-600',
    rejected: 'bg-danger-50 text-danger-600',
    pending: 'bg-ink-100 text-ink-600',
    accepted: 'bg-accent-50 text-accent-600',
  };
  return (
    <span className={`badge ${colors[status] || 'bg-ink-100 text-ink-600'}`}>
      {label}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="mb-4 text-ink-300">{icon}</div>
      <h3 className="text-lg font-semibold text-ink-800 mb-1">{title}</h3>
      <p className="text-sm text-ink-500 mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-pixio-500 flex items-center justify-center animate-pulse-soft">
          <svg viewBox="0 0 64 64" className="w-7 h-7">
            <path d="M32 14L48 26V48C48 49.1 47.1 50 46 50H36V38H28V50H18C16.9 50 16 49.1 16 48V26L32 14Z" fill="white"/>
            <circle cx="46" cy="20" r="6" fill="#10B981" stroke="white" strokeWidth="2"/>
          </svg>
        </div>
        <Spinner className="text-pixio-500" size={20} />
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-ink-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-ink-800">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors">
            <X size={20} className="text-ink-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function InfoPill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ink-500">
      {icon}
      {children}
    </div>
  );
}

export function DistancePill({ km }: { km: number }) {
  return (
    <InfoPill icon={<MapPin size={12} />}>
      {km.toFixed(1)} km
    </InfoPill>
  );
}

export function TimePill({ days }: { days: number }) {
  return (
    <InfoPill icon={<Clock size={12} />}>
      {days}d
    </InfoPill>
  );
}

export function SuccessIcon() {
  return <CheckCircle2 className="text-accent-500" size={20} />;
}

export function ErrorIcon() {
  return <AlertCircle className="text-danger-500" size={20} />;
}
