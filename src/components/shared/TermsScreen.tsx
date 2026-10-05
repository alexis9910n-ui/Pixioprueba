import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { Shield, FileText, Scale, Lock, Gavel } from 'lucide-react';

export function TermsScreen() {
  const { t } = useTranslation();
  const { goBack } = useNavigate();

  return (
    <div className="animate-fade-in">
      <div className="sticky top-14 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <span className="text-ink-600 text-sm font-medium">← Back</span>
        </button>
        <h1 className="font-semibold text-ink-800">{t('terms.title')}</h1>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
        <TermCard
          icon={<Shield size={20} />}
          title={t('terms.section1Title')}
          body={t('terms.section1Body')}
        />
        <TermCard
          icon={<Lock size={20} />}
          title={t('terms.section2Title')}
          body={t('terms.section2Body')}
        />
        <TermCard
          icon={<Gavel size={20} />}
          title={t('terms.section3Title')}
          body={t('terms.section3Body')}
        />
        <TermCard
          icon={<FileText size={20} />}
          title={t('terms.section4Title')}
          body={t('terms.section4Body')}
        />
        <TermCard
          icon={<Scale size={20} />}
          title={t('terms.section5Title')}
          body={t('terms.section5Body')}
        />
        <TermCard
          icon={<Scale size={20} />}
          title={t('terms.section6Title')}
          body={t('terms.section6Body')}
        />
      </div>
    </div>
  );
}

function TermCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-pixio-50 text-pixio-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <h2 className="font-semibold text-ink-800 text-sm pt-1">{title}</h2>
      </div>
      <p className="text-sm text-ink-600 leading-relaxed">{body}</p>
    </div>
  );
}
