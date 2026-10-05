import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useClientJobs, useCategories } from '@/lib/hooks';
import { getCategoryName } from '@/lib/categories';
import { timeAgo } from '@/lib/format';
import { EmptyState, StatusBadge } from '@/components/ui';
import { getIcon } from '@/lib/icons';
import { Plus, Briefcase, MapPin } from 'lucide-react';

export function ClientProjects() {
  const { t, i18n } = useTranslation();
  const { navigate } = useNavigate();
  const { profile } = useAuth();
  const { categories } = useCategories();
  const { jobs, loading } = useClientJobs(profile?.id);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const active = jobs.filter((p) => !['completed', 'cancelled'].includes(p.status));
  const completed = jobs.filter((p) => p.status === 'completed');
  const display = tab === 'active' ? active : completed;

  return (
    <div className="animate-fade-in px-4 py-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-ink-800">{t('client.projects.title')}</h1>
        <button type="button" onClick={() => navigate('new-request')} className="btn-primary px-4 py-2 text-xs">
          <Plus size={16} /> {t('client.projects.newProject')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'active' ? 'bg-white text-pixio-700 shadow-sm' : 'text-ink-500'}`}
        >
          {t('client.projects.active')} ({active.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'completed' ? 'bg-white text-pixio-700 shadow-sm' : 'text-ink-500'}`}
        >
          {t('client.projects.completed')} ({completed.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      ) : display.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={48} />}
          title={t('client.projects.noProjects')}
          description={t('client.projects.noProjectsDesc')}
          action={<button type="button" onClick={() => navigate('new-request')} className="btn-primary">{t('client.projects.newProject')}</button>}
        />
      ) : (
        <div className="space-y-3">
          {display.map((job) => {
            const cat = categories.find((c) => c.slug === job.category);
            const Icon = cat ? getIcon(cat.icon) : getIcon('Hammer');
            const statusKey = `client.projects.status.${job.status}`;
            return (
              <button
                key={job.id}
                onClick={() => navigate('project-detail', { id: job.id })}
                className="card p-4 w-full text-left hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-ink-800 text-sm line-clamp-1">{job.title}</h3>
                      <StatusBadge status={job.status} label={t(statusKey)} />
                    </div>
                    {cat && <p className="text-xs text-ink-400 mt-0.5">{getCategoryName(cat, i18n.language)}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-ink-400">
                      <span className="flex items-center gap-1"><MapPin size={11} />{job.zip_code}</span>
                      <span>{timeAgo(job.created_at)}</span>
                      <span className="badge bg-pixio-50 text-pixio-600">{job.quotes_count} {t('client.projects.bids')}</span>
                    </div>
                  </div>
                </div>

                {job.status === 'open' && job.quotes_count > 0 && (
                  <div className="mt-2">
                    <span onClick={(e) => { e.stopPropagation(); navigate('compare-bids', { id: job.id }); }} className="text-xs font-semibold text-pixio-600 hover:underline cursor-pointer">
                      {t('client.projects.viewBids')} →
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
