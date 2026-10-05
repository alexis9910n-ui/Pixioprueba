import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useMode } from '@/lib/mode';
import { supportedLanguages } from '@/i18n';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import {
  Home, Search, Briefcase, MessageSquare, Wallet, User as UserIcon,
  Globe, LogOut, ShieldCheck, Shield,
} from 'lucide-react';

export type NavPage = 'home' | 'search' | 'projects' | 'feed' | 'messages' | 'wallet' | 'profile';

interface AppShellProps {
  page: NavPage;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export function AppShell({ page, onNavigate, children }: AppShellProps) {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const { mode } = useMode();
  const [showProfile, setShowProfile] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowProfile(false);
  };

  const navItems: { key: NavPage; label: string; icon: ReactNode }[] =
    mode === 'contractor'
      ? [
          { key: 'feed', label: t('nav.feed'), icon: <Search size={20} /> },
          { key: 'projects', label: t('nav.projects'), icon: <Briefcase size={20} /> },
          { key: 'messages', label: t('nav.messages'), icon: <MessageSquare size={20} /> },
          { key: 'wallet', label: t('nav.wallet'), icon: <Wallet size={20} /> },
          { key: 'profile', label: t('nav.profile'), icon: <UserIcon size={20} /> },
        ]
      : [
          { key: 'home', label: t('nav.home'), icon: <Home size={20} /> },
          { key: 'search', label: t('nav.search'), icon: <Search size={20} /> },
          { key: 'projects', label: t('nav.projects'), icon: <Briefcase size={20} /> },
          { key: 'messages', label: t('nav.messages'), icon: <MessageSquare size={20} /> },
          { key: 'profile', label: t('nav.profile'), icon: <UserIcon size={20} /> },
        ];

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => onNavigate(mode === 'contractor' ? 'feed' : 'home')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pixio-500 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5">
                <path d="M32 14L48 26V48C48 49.1 47.1 50 46 50H36V38H28V50H18C16.9 50 16 49.1 16 48V26L32 14Z" fill="white"/>
                <circle cx="46" cy="20" r="6" fill="#10B981" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span className="font-bold text-ink-800 text-lg">Pixio</span>
            {mode === 'contractor' && (
              <span className="badge bg-pixio-100 text-pixio-700 text-[10px] font-bold">PRO</span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-500 bg-ink-100 rounded-full px-3 py-1.5">
              {mode === 'contractor' ? t('app.mode.contractor') : t('app.mode.client')}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 rounded-lg hover:bg-ink-100 transition-colors"
              >
                <Globe size={18} className="text-ink-600" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg py-1 animate-slide-down z-50">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        if (['en', 'es'].includes(lang.code)) {
                          i18n.changeLanguage(lang.code);
                          setShowLangMenu(false);
                        }
                      }}
                      disabled={!['en', 'es'].includes(lang.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-ink-50 transition-colors ${
                        i18n.language === lang.code ? 'text-pixio-700 font-semibold' : 'text-ink-600'
                      } ${!['en', 'es'].includes(lang.code) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      {lang.name}
                      {!['en', 'es'].includes(lang.code) && (
                        <span className="ml-auto text-xs text-ink-400">soon</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowProfile(!showProfile)}
              className="w-8 h-8 rounded-full bg-pixio-100 text-pixio-700 flex items-center justify-center text-sm font-semibold relative overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() || <UserIcon size={16} />
              )}
              {profile?.verification_status === 'verified' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                  <ShieldCheck size={8} className="text-white" />
                </span>
              )}
            </button>
          </div>
        </div>

        {showProfile && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
            <div className="absolute right-4 top-14 w-64 bg-white rounded-xl shadow-lg py-2 animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-ink-100">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-800">{profile?.full_name}</p>
                  <VerifiedBadge status={profile?.verification_status || 'unverified'} size="sm" />
                </div>
                <p className="text-xs text-ink-500">{profile?.email}</p>
                <p className="text-xs text-pixio-600 mt-1 capitalize">
                  {profile?.role === 'contractor' ? t('app.mode.contractor') : t('app.mode.client')}
                </p>
              </div>
              {profile?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); onNavigate('admin'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-pixio-700 bg-pixio-50 hover:bg-pixio-100 transition-colors font-semibold"
                >
                  <Shield size={16} className="text-pixio-600" />
                  {i18n.language === 'es' ? 'Panel Modo Creador' : 'Creator Mode Panel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowProfile(false); onNavigate('verification'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
              >
                <ShieldCheck size={16} className={profile?.verification_status === 'verified' ? 'text-blue-500' : 'text-ink-400'} />
                {t('verification.title')}
                {profile?.verification_status !== 'verified' && (
                  <span className="ml-auto text-[10px] font-semibold text-warning-600 bg-warning-100 px-2 py-0.5 rounded-full">
                    {profile?.verification_status === 'pending' ? t('verification.pending') : t('verification.unverified')}
                  </span>
                )}
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut size={16} />
                {t('auth.signOut')}
              </button>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ink-100 safe-bottom">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 h-16">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                page === item.key ? 'text-pixio-600' : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
