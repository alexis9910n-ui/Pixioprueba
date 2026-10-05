import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Fingerprint, X, Smartphone } from 'lucide-react';
import { Spinner } from '@/components/ui';

function isWebAuthnAvailable(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

async function registerPasskey(userId: string, userName: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Pixio',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    });
    return !!credential;
  } catch {
    return false;
  }
}

async function markBiometricEnabled(userId: string) {
  await supabase
    .from('profiles')
    .update({ biometric_enabled: true })
    .eq('id', userId);
}

interface BiometricPromptProps {
  userId: string;
  userName: string;
  onDismiss: () => void;
}

export function BiometricPrompt({ userId, userName, onDismiss }: BiometricPromptProps) {
  const { i18n } = useTranslation();
  const { refreshProfile } = useAuth();
  const isEs = i18n.language === 'es';
  const [registering, setRegistering] = useState(false);

  if (!isWebAuthnAvailable()) {
    return null;
  }

  const handleEnable = async () => {
    setRegistering(true);
    const ok = await registerPasskey(userId, userName);
    setRegistering(false);
    await markBiometricEnabled(userId);
    refreshProfile();
    onDismiss();
  };

  const handleSkip = async () => {
    await markBiometricEnabled(userId);
    refreshProfile();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
        <div className="flex justify-end -mt-2 -mr-2">
          <button type="button" onClick={handleSkip} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400">
            <X size={18} />
          </button>
        </div>

        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-pixio-50 flex items-center justify-center mx-auto mb-4">
            <Fingerprint size={32} className="text-pixio-600" />
          </div>
          <h3 className="text-lg font-bold text-ink-800 mb-1">
            {isEs ? 'Acceso Rapido' : 'Quick Access'}
          </h3>
          <p className="text-sm text-ink-500">
            {isEs
              ? 'Activa Face ID o huella digital para ingresar mas rapido en tus proximos accesos.'
              : 'Enable Face ID or fingerprint to sign in faster next time.'}
          </p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-pixio-50 mb-5">
          <Smartphone size={20} className="text-pixio-600 shrink-0" />
          <p className="text-xs text-pixio-700">
            {isEs
              ? 'Tu dispositivo soporta autenticacion biometrica segura.'
              : 'Your device supports secure biometric authentication.'}
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={registering}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {registering ? (
              <Spinner size={18} />
            ) : (
              <>
                <Fingerprint size={18} />
                {isEs ? 'Activar' : 'Enable'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2.5 text-sm text-ink-500 hover:text-ink-700 transition-colors"
          >
            {isEs ? 'Ahora no' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
