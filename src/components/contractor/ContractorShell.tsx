import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supportedLanguages } from '@/i18n';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import {
  LayoutDashboard, Search, Briefcase, MessageSquare, Wallet,
  Globe, LogOut, ShieldCheck, Shield, ChevronDown,
} from 'lucide-react';

export type ContractorNav =
  | 'dashboard'
  | 'feed'
  | 'projects'
  | 'messages'
  | 'wallet';

interface Props {
  page: ContractorNav;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export function ContractorShell({ page, onNavigate, children }: Props) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { profile, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowProfile(false);
  };

  const navItems: { key: ContractorNav; label: string; icon: ReactNode }[] = [
    { key: 'dashboard', label: isEs ? 'Inicio' : 'Home', icon: <LayoutDashboard size={20} /> },
    { key: 'feed', label: isEs ? 'Trabajos' : 'Jobs', icon: <Search size={20} /> },
    { key: 'projects', label: isEs ? 'Proyectos' : 'Projects', icon: <Briefcase size={20} /> },
    { key: 'messages', label: isEs ? 'Mensajes' : 'Messages', icon: <MessageSquare size={20} /> },
    { key: 'wallet', label: isEs ? 'Cartera' : 'Wallet', icon: <Wallet size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Dark header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg viewBox="0 0 64 64" className="w-5 h-5">
                <path d="M32 14L48 26V48C48 49.1 47.1 50 46 50H36V38H28V50H18C16.9 50 16 49.1 16 48V26L32 14Z" fill="white"/>
                <circle cx="46" cy="20" r="6" fill="#10B981" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span className="font-bold text-white text-lg">Pixio</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
              Pro
            </span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full px-3 py-1.5 border border-slate-700/50 uppercase tracking-wide">
              {isEs ? 'Contratista' : 'Contractor'}
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Globe size={18} className="text-slate-400" />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 animate-slide-down z-50">
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (['en', 'es'].includes(lang.code)) {
                          i18n.changeLanguage(lang.code);
                          setShowLangMenu(false);
                        }
                      }}
                      disabled={!['en', 'es'].includes(lang.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        i18n.language === lang.code ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                      } ${!['en', 'es'].includes(lang.code) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm font-semibold relative overflow-hidden"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() || '?'
              )}
              {profile?.verification_status === 'verified' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <ShieldCheck size={8} className="text-white" />
                </span>
              )}
            </button>
          </div>
        </div>

        {showProfile && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
            <div className="absolute right-4 top-14 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 animate-slide-down z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{profile?.full_name}</p>
                  <VerifiedBadge status={profile?.verification_status || 'unverified'} size="sm" />
                </div>
                <p className="text-xs text-slate-400">{profile?.email}</p>
                {profile?.company_name && (
                  <p className="text-xs text-emerald-400 mt-1">{profile.company_name}</p>
                )}
              </div>
              {profile?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); onNavigate('admin'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-400 hover:bg-slate-700 transition-colors font-semibold"
                >
                  <Shield size={16} />
                  {isEs ? 'Panel Admin' : 'Admin Panel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowProfile(false); onNavigate('verification'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <ShieldCheck size={16} className={profile?.verification_status === 'verified' ? 'text-emerald-400' : 'text-slate-500'} />
                {t('verification.title')}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
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

      {/* Dark bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 safe-bottom">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const active = page === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  active
                    ? 'text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
