import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useMessages, fetchJobById } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Spinner, EmptyState } from '@/components/ui';
import { ArrowLeft, Send, ShieldAlert, Lock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { JobRequest } from '@/lib/types';

export function Messages({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { goBack } = useNavigate();
  const { profile } = useAuth();
  const { messages, loading } = useMessages(projectId, profile?.id);
  const [input, setInput] = useState('');
  const [project, setProject] = useState<JobRequest | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJobById(projectId).then((p) => {
      if (!cancelled) setProject(p);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile) return;
    const content = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      project_id: projectId,
      sender_id: profile.id,
      content,
    });
  };

  const hasMasked = messages.some((m) => m.is_masked);

  return (
    <div className="animate-fade-in flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-ink-800 text-sm line-clamp-1">{project?.title || 'Messages'}</h1>
        </div>
      </div>

      {/* Masking warning */}
      {hasMasked && (
        <div className="bg-warning-50 border-b border-warning-100 px-4 py-2 flex items-center gap-2">
          <Lock size={14} className="text-warning-600 shrink-0" />
          <p className="text-xs text-warning-600">{t('chat.maskedWarning')}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-pixio-500" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<Send size={40} />}
            title={t('chat.noChat')}
            description="Start a conversation about this project."
          />
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === profile?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? 'bg-pixio-500 text-white rounded-br-md'
                      : 'bg-white border border-ink-100 text-ink-800 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-pixio-200' : 'text-ink-400'}`}>
                    {formatDateTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-16 bg-white border-t border-ink-100 px-4 py-3 safe-bottom">
        <form onSubmit={handleSend} className="flex gap-2 max-w-2xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input flex-1"
            placeholder={t('chat.placeholder')}
          />
          <button type="submit" disabled={!input.trim()} className="btn-primary px-4">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
