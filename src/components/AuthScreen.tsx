import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { supportedLanguages } from '@/i18n';
import { useCategories } from '@/lib/hooks';
import { getCategoryName, GENERAL_CONSTRUCTION, generalConstructionLabel } from '@/lib/categories';
import { useToast } from '@/lib/toast';
import { Spinner } from '@/components/ui';
import { Home, Wrench, Globe, Mail, Lock, User as UserIcon, Phone, Eye, EyeOff, Building2, FileText, ArrowLeft, CheckCircle2, Square, CheckSquare } from 'lucide-react';
import { TermsModal } from '@/components/shared/TermsModal';
import type { UserRole } from '@/lib/types';

type AuthStep = 'welcome' | 'role' | 'signin' | 'signup' | 'forgot' | 'privacy';

function translateError(t: (key: string) => string, error: string): string {
  if (error.startsWith('auth.')) return t(error);
  return error;
}

function PasswordInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input pl-10 pr-10"
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function PrivacyPolicyInline({ onBack }: { onBack: () => void }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  return (
    <div className="w-full max-w-sm animate-slide-up">
      <div className="bg-white rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-pixio-600 font-medium mb-4 hover:underline">
          <ArrowLeft size={16} /> {isEs ? 'Volver' : 'Back'}
        </button>
        <h2 className="text-lg font-bold text-ink-800 mb-3">
          {isEs ? 'AVISO DE PRIVACIDAD' : 'PRIVACY NOTICE'}
        </h2>
        <div className="text-xs text-ink-600 leading-relaxed space-y-3">
          {isEs ? (
            <>
              <p>Pixio (en adelante, "la Plataforma") esta comprometida con la proteccion de los datos personales y la privacidad de nuestros usuarios.</p>
              <p><strong>1. DATOS QUE RECOPILAMOS:</strong> Nombre, correo, telefono, ubicacion, datos de uso y transacciones.</p>
              <p><strong>2. FINALIDAD:</strong> Gestionar cuentas, facilitar comunicacion cliente-contratista, geolocalizacion, notificaciones y seguridad.</p>
              <p><strong>3. PROTECCION:</strong> Datos almacenados en infraestructura segura y encriptada (Supabase).</p>
              <p><strong>4. TERCEROS:</strong> No vendemos datos. Solo se comparten entre usuarios del proyecto, proveedores de infraestructura y por requerimiento legal.</p>
              <p><strong>5. DERECHOS ARCO:</strong> Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos desde tu perfil.</p>
              <p><strong>6. MODIFICACIONES:</strong> Este aviso puede actualizarse; los cambios se notificaran por la app o correo.</p>
              <p className="text-ink-400 pt-2 border-t border-ink-100">Ultima actualizacion: Septiembre 2026.</p>
            </>
          ) : (
            <>
              <p>Pixio ("the Platform") is committed to protecting the personal data and privacy of our users.</p>
              <p><strong>1. DATA WE COLLECT:</strong> Name, email, phone, location, usage data and transactions.</p>
              <p><strong>2. PURPOSE:</strong> Account management, client-contractor communication, geolocation, notifications and security.</p>
              <p><strong>3. PROTECTION:</strong> Data stored on secure, encrypted infrastructure (Supabase).</p>
              <p><strong>4. THIRD PARTIES:</strong> We do not sell data. Data is only shared between project users, infrastructure providers, and as required by law.</p>
              <p><strong>5. YOUR RIGHTS:</strong> You may access, correct, cancel or object to data processing from your profile.</p>
              <p><strong>6. CHANGES:</strong> This notice may be updated; changes will be communicated via the app or email.</p>
              <p className="text-ink-400 pt-2 border-t border-ink-100">Last updated: September 2026.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthScreen() {
  const { t, i18n } = useTranslation();
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const { categories } = useCategories();
  const isEs = i18n.language === 'es';
  const [step, setStep] = useState<AuthStep>('welcome');
  const [prevStep, setPrevStep] = useState<AuthStep>('signup');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [trades, setTrades] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const toggleTrade = (slug: string) =>
    setTrades((prev) => (prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]));
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) showToast(translateError(t, error), 'error');
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return showToast(t('auth.errorEmail'), 'error');
    if (password.length < 6) return showToast(t('auth.errorPassword'), 'error');
    if (!fullName.trim()) return showToast(t('auth.errorName'), 'error');
    if (!termsAccepted) return showToast(t('auth.errorTerms'), 'error');
    if (selectedRole === 'contractor') {
      if (!companyName.trim()) return showToast(t('auth.errorCompanyName'), 'error');
      if (!licenseNumber.trim()) return showToast(t('auth.errorLicenseNumber'), 'error');
      if (!businessPhone.trim()) return showToast(t('auth.errorBusinessPhone'), 'error');
      if (trades.length === 0) return showToast(isEs ? 'Selecciona al menos un oficio' : 'Select at least one trade', 'error');
    }
    setLoading(true);
    const extraFields = selectedRole === 'contractor'
      ? { companyName: companyName.trim(), licenseNumber: licenseNumber.trim(), businessPhone: businessPhone.trim(), trades }
      : undefined;
    const { error } = await signUp(email, password, fullName, phone, selectedRole, extraFields);
    setLoading(false);
    if (error === 'auth.errorExistsTryLogin') {
      showToast(
        isEs
          ? 'Este correo ya esta registrado. Intenta iniciar sesion o restablece tu contrasena.'
          : 'This email is already registered. Try signing in or reset your password.',
        'error'
      );
      setStep('signin');
      return;
    }
    if (error) showToast(translateError(t, error), 'error');
    else showToast(t('auth.welcome'), 'success');
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return showToast(t('auth.errorResetEmail'), 'error');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) {
        showToast(error.message, 'error');
      } else {
        setResetSent(true);
      }
    } catch {
      showToast(t('auth.errorNetwork'), 'error');
    }
    setLoading(false);
  };

  const goToPrivacy = (from: AuthStep) => {
    setPrevStep(from);
    setStep('privacy');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pixio-500 to-pixio-700 flex flex-col">
      {/* Language selector */}
      <div className="absolute top-4 right-4 z-10">
        <button type="button" onClick={() => setShowLangMenu(!showLangMenu)}
          className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-2 text-white text-sm font-medium hover:bg-white/30 transition-colors">
          <Globe size={16} />
          {supportedLanguages.find((l) => l.code === i18n.language)?.flag || ''}
        </button>
        {showLangMenu && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg py-1 animate-slide-down">
            {supportedLanguages.map((lang) => (
              <button type="button" key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                disabled={!['en', 'es'].includes(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-ink-50 transition-colors ${
                  i18n.language === lang.code ? 'text-pixio-700 font-semibold' : 'text-ink-600'
                } ${!['en', 'es'].includes(lang.code) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <span className="text-lg">{lang.flag}</span>
                {lang.name}
                {!['en', 'es'].includes(lang.code) && <span className="ml-auto text-xs text-ink-400">soon</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center animate-scale-in">
          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-lg mb-3">
            <svg viewBox="0 0 64 64" className="w-10 h-10">
              <path d="M32 14L48 26V48C48 49.1 47.1 50 46 50H36V38H28V50H18C16.9 50 16 49.1 16 48V26L32 14Z" fill="#0F52BA"/>
              <circle cx="46" cy="20" r="6" fill="#10B981" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pixio</h1>
          <p className="text-pixio-100 text-sm mt-1">{t('app.tagline')}</p>
        </div>

        {/* Welcome */}
        {step === 'welcome' && (
          <div className="w-full max-w-sm animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-ink-800 mb-1">{t('auth.welcome')}</h2>
              <p className="text-sm text-ink-500 mb-6">{t('auth.welcomeSub')}</p>
              <button type="button" onClick={() => setStep('role')} className="btn-primary w-full">{t('auth.continue')}</button>
            </div>
          </div>
        )}

        {/* Role selection */}
        {step === 'role' && (
          <div className="w-full max-w-sm animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-ink-800 mb-4">{t('auth.selectRole')}</h2>
              <div className="space-y-3">
                <RoleCard icon={<Home size={24} />} title={t('auth.asClient')} desc={t('auth.asClientSub')} selected={selectedRole === 'client'} onClick={() => setSelectedRole('client')} />
                <RoleCard icon={<Wrench size={24} />} title={t('auth.asContractor')} desc={t('auth.asContractorSub')} selected={selectedRole === 'contractor'} onClick={() => setSelectedRole('contractor')} />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep('welcome')} className="btn-ghost flex-1">{t('common.back')}</button>
                <button type="button" onClick={() => setStep('signup')} className="btn-primary flex-1">{t('auth.continue')}</button>
              </div>
              <p className="text-center text-sm text-ink-500 mt-4">
                {t('auth.haveAccount')}{' '}
                <button type="button" onClick={() => setStep('signin')} className="text-pixio-600 font-semibold hover:underline">{t('auth.signIn')}</button>
              </p>
            </div>
          </div>
        )}

        {/* Sign In */}
        {step === 'signin' && (
          <div className="w-full max-w-sm animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-ink-800 mb-4">{t('auth.signIn')}</h2>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="label">{t('auth.password')}</label>
                  <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner size={18} /> : t('auth.signIn')}
                </button>
              </form>
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setStep('forgot'); }}
                  className="text-sm text-pixio-600 font-medium hover:underline"
                >
                  {isEs ? 'Olvidaste tu contrasena?' : 'Forgot your password?'}
                </button>
              </div>
              <p className="text-center text-sm text-ink-500 mt-3">
                {t('auth.noAccount')}{' '}
                <button type="button" onClick={() => setStep('role')} className="text-pixio-600 font-semibold hover:underline">{t('auth.signUp')}</button>
              </p>
            </div>
          </div>
        )}

        {/* Forgot Password */}
        {step === 'forgot' && (
          <div className="w-full max-w-sm animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              {resetSent ? (
                <div className="text-center py-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-success-50 flex items-center justify-center mb-4">
                    <CheckCircle2 size={28} className="text-success-500" />
                  </div>
                  <h2 className="text-lg font-bold text-ink-800 mb-2">
                    {isEs ? 'Correo enviado' : 'Email sent'}
                  </h2>
                  <p className="text-sm text-ink-500 mb-4">
                    {isEs
                      ? <>Hemos enviado un enlace de recuperacion a <strong className="text-ink-700">{email}</strong>. Revisa tu bandeja de entrada (y spam).</>
                      : <>We sent a recovery link to <strong className="text-ink-700">{email}</strong>. Check your inbox (and spam).</>}
                  </p>
                  <button type="button" onClick={() => setStep('signin')} className="btn-primary w-full">
                    {isEs ? 'Volver a Iniciar Sesion' : 'Back to Sign In'}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-ink-800 mb-2">
                    {isEs ? 'Recuperar Contrasena' : 'Reset Password'}
                  </h2>
                  <p className="text-sm text-ink-500 mb-4">
                    {isEs
                      ? 'Ingresa tu correo electronico y te enviaremos un enlace para restablecer tu contrasena.'
                      : 'Enter your email and we will send you a link to reset your password.'}
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="label">{t('auth.email')}</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? <Spinner size={18} /> : (isEs ? 'Enviar Enlace' : 'Send Link')}
                    </button>
                  </form>
                  <div className="text-center mt-4">
                    <button type="button" onClick={() => setStep('signin')} className="text-sm text-pixio-600 font-medium hover:underline">
                      {isEs ? 'Volver a Iniciar Sesion' : 'Back to Sign In'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sign Up */}
        {step === 'signup' && (
          <div className="w-full max-w-sm animate-slide-up">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-ink-800 mb-1">{t('auth.signUp')}</h2>
              <p className="text-sm text-ink-500 mb-4">{selectedRole === 'client' ? t('auth.asClient') : t('auth.asContractor')}</p>
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="label">{t('auth.fullName')}</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input pl-10" required />
                  </div>
                </div>
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label className="label">{t('auth.phone')}</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input pl-10" placeholder="+1 555 000 0000" />
                  </div>
                </div>

                {selectedRole === 'contractor' && (
                  <>
                    <div className="border-t border-ink-100 pt-3 mt-3">
                      <p className="text-xs font-semibold text-pixio-600 mb-3 uppercase tracking-wide">
                        {isEs ? 'Datos de Empresa' : 'Company Details'}
                      </p>
                    </div>
                    <div>
                      <label className="label">
                        {isEs ? 'Nombre de la Empresa' : 'Company Name'} <span className="text-danger-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input pl-10" placeholder={isEs ? 'Mi Empresa LLC' : 'My Company LLC'} />
                      </div>
                    </div>
                    <div>
                      <label className="label">
                        {isEs ? 'Numero de Licencia Comercial' : 'Business License Number'} <span className="text-danger-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="input pl-10" placeholder="LIC-123456" />
                      </div>
                    </div>
                    <div>
                      <label className="label">
                        {isEs ? 'Telefono Comercial' : 'Business Phone'} <span className="text-danger-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="input pl-10" placeholder="+1 555 000 0000" />
                      </div>
                    </div>
                    <div>
                      <label className="label">
                        {isEs ? 'Oficios y Especialidades' : 'Trades & Specialties'} <span className="text-danger-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleTrade(GENERAL_CONSTRUCTION)}
                        className={`w-full flex items-center gap-2 rounded-lg border-2 px-3 py-2 mb-2 text-sm font-semibold transition-all ${
                          trades.includes(GENERAL_CONSTRUCTION)
                            ? 'border-pixio-500 bg-pixio-50 text-pixio-700'
                            : 'border-ink-200 text-ink-600 hover:border-ink-300'
                        }`}
                      >
                        <Building2 size={15} />
                        {generalConstructionLabel(i18n.language)}
                        <span className="text-[10px] font-normal text-ink-400 ml-auto">
                          {isEs ? 'Todos' : 'All'}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {categories.map((cat) => {
                          const active = trades.includes(cat.slug);
                          return (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => toggleTrade(cat.slug)}
                              className={`text-[11px] rounded-full px-2.5 py-1 font-medium border transition-all ${
                                active
                                  ? 'bg-pixio-500 text-white border-pixio-500'
                                  : 'bg-white text-ink-600 border-ink-200 hover:border-pixio-300'
                              }`}
                            >
                              {getCategoryName(cat, i18n.language)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="label">{t('auth.password')}</label>
                  <PasswordInput value={password} onChange={setPassword} placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? <Spinner size={18} /> : t('auth.signUp')}
                </button>
              </form>

              <div className="flex items-start gap-2.5 mt-4 px-1">
                <button
                  type="button"
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`shrink-0 mt-0.5 transition-colors ${termsAccepted ? 'text-pixio-600' : 'text-ink-300'}`}
                >
                  {termsAccepted ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <p className="text-xs text-ink-500 leading-relaxed">
                  {isEs ? (
                    <>
                      He leido y acepto los{' '}
                      <button type="button" onClick={() => setShowTermsModal(true)} className="text-pixio-600 font-semibold underline">
                        Terminos y Condiciones
                      </button>{' '}
                      y el{' '}
                      <button type="button" onClick={() => goToPrivacy('signup')} className="text-pixio-600 font-semibold underline">
                        Aviso de Privacidad
                      </button>.
                    </>
                  ) : (
                    <>
                      I have read and accept the{' '}
                      <button type="button" onClick={() => setShowTermsModal(true)} className="text-pixio-600 font-semibold underline">
                        Terms & Conditions
                      </button>{' '}
                      and the{' '}
                      <button type="button" onClick={() => goToPrivacy('signup')} className="text-pixio-600 font-semibold underline">
                        Privacy Notice
                      </button>.
                    </>
                  )}
                </p>
              </div>

              <TermsModal open={showTermsModal} onClose={() => setShowTermsModal(false)} lang={i18n.language} />

              <p className="text-center text-sm text-ink-500 mt-3">
                {t('auth.haveAccount')}{' '}
                <button type="button" onClick={() => setStep('signin')} className="text-pixio-600 font-semibold hover:underline">{t('auth.signIn')}</button>
              </p>
            </div>
          </div>
        )}

        {/* Privacy Policy inline */}
        {step === 'privacy' && (
          <PrivacyPolicyInline onBack={() => setStep(prevStep)} />
        )}
      </div>
    </div>
  );
}

function RoleCard({ icon, title, desc, selected, onClick }: {
  icon: React.ReactNode; title: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
        selected ? 'border-pixio-500 bg-pixio-50' : 'border-ink-200 hover:border-ink-300'
      }`}>
      <div className={`p-2.5 rounded-xl ${selected ? 'bg-pixio-500 text-white' : 'bg-ink-100 text-ink-500'}`}>{icon}</div>
      <div>
        <p className={`font-semibold ${selected ? 'text-pixio-700' : 'text-ink-700'}`}>{title}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </button>
  );
}
