import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { SafeImage } from '@/components/ui';

interface LightboxProps {
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function Lightbox({ urls, initialIndex = 0, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const current = urls[index];
  const isPdf = current?.toLowerCase().endsWith('.pdf');

  const next = useCallback(() => setIndex((i) => (i + 1) % urls.length), [urls.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + urls.length) % urls.length), [urls.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, next, prev]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in">
      <button type="button" onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
        <X size={20} />
      </button>

      {urls.length > 1 && (
        <>
          <button type="button" onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <button type="button" onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center px-12">
        {isPdf ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <FileText size={48} className="text-danger-500 mx-auto mb-3" />
            <p className="text-ink-700 font-medium mb-3">PDF Document</p>
            <a href={current} target="_blank" rel="noopener noreferrer"
              className="btn-primary inline-block">
              Open PDF
            </a>
          </div>
        ) : (
          <img src={current} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        )}
      </div>

      {urls.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {urls.map((_, i) => (
            <button type="button" key={i} onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PhotoGallery({ urls }: { urls: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => {
          const isPdf = url.toLowerCase().endsWith('.pdf');
          return (
            <button type="button" key={i} onClick={() => setLightboxIdx(i)}
              className="w-20 h-20 rounded-xl overflow-hidden border border-ink-200 hover:border-pixio-300 transition-colors bg-ink-50 flex items-center justify-center">
              {isPdf ? (
                <FileText size={24} className="text-danger-500" />
              ) : (
                <SafeImage src={url} className="w-full h-full object-cover" />
              )}
            </button>
          );
        })}
      </div>
      {lightboxIdx !== null && (
        <Lightbox urls={urls} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}
