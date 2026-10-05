import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Spinner } from '@/components/ui';
import type { Review } from '@/lib/types';

interface ReviewFormProps {
  projectId: string;
  reviewerId: string;
  revieweeId: string;
  existingReview: Review | null;
  onSubmitted: (review: Review) => void;
}

export function ReviewForm({ projectId, reviewerId, revieweeId, existingReview, onSubmitted }: ReviewFormProps) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { showToast } = useToast();

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);

  if (existingReview) {
    return (
      <div className="rounded-xl bg-accent-50 border border-accent-100 p-4">
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={16} className={s <= existingReview.rating ? 'text-warning-500 fill-warning-500' : 'text-ink-200'} />
          ))}
          <span className="text-xs text-ink-500 ml-2">{isEs ? 'Tu calificacion' : 'Your rating'}</span>
        </div>
        {existingReview.comment && (
          <p className="text-sm text-ink-600 mt-1">"{existingReview.comment}"</p>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast(isEs ? 'Selecciona una calificacion' : 'Select a rating', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          project_id: projectId,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim() || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Update the reviewee's average rating
      const { data: stats } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

      if (stats && stats.length > 0) {
        const avg = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length;
        await supabase
          .from('profiles')
          .update({ rating_avg: Math.round(avg * 10) / 10, rating_count: stats.length })
          .eq('id', revieweeId);
      }

      showToast(isEs ? 'Calificacion enviada' : 'Review submitted', 'success');
      onSubmitted(data as Review);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-ink-800">
        {isEs ? 'Califica este trabajo' : 'Rate this job'}
      </p>

      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoveredStar(s)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`transition-colors ${
                s <= (hoveredStar || rating)
                  ? 'text-warning-500 fill-warning-500'
                  : 'text-ink-200'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm font-bold text-warning-600 ml-2">{rating}/5</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="input min-h-[80px] resize-y"
        placeholder={isEs ? 'Comentario opcional...' : 'Optional comment...'}
        maxLength={500}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {submitting ? <Spinner size={16} /> : (
          <>
            <Send size={14} />
            {isEs ? 'Enviar Calificacion' : 'Submit Review'}
          </>
        )}
      </button>
    </div>
  );
}

export function StarRating({ rating, count }: { rating: number | null; count: number }) {
  const avg = rating || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= Math.round(avg) ? 'text-warning-500 fill-warning-500' : 'text-ink-200'}
        />
      ))}
      {count > 0 && (
        <span className="text-xs text-ink-500 ml-1">
          {avg.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}
