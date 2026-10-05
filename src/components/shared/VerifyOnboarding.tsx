import { useState, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import {
  ShieldCheck, CreditCard, Car, BookOpen, Camera, Upload, ArrowRight,
} from 'lucide-react';

type DocType = 'id_card' | 'drivers_license' | 'passport';

const DOC_OPTIONS: { value: DocType; labelEs: string; labelEn: string; icon: typeof CreditCard }[] = [
  { value: 'id_card', labelEs: 'ID Oficial / Identificacion Personal', labelEn: 'Official ID', icon: CreditCard },
  { value: 'drivers_license', labelEs: 'Licencia de Conducir', labelEn: "Driver's License", icon: Car },
  { value: 'passport', labelEs: 'Pasaporte', labelEn: 'Passport', icon: BookOpen },
];

async function uploadToBucket(file: File, userId: string, label: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${label}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('verification-documents').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) return null;
  const { data } = supabase.storage.from('verification-documents').getPublicUrl(path);
  return data.publicUrl;
}

export function VerifyOnboarding({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'docType' | 'upload' | 'selfie'>('docType');
  const [docType, setDocType] = useState<DocType | ''>('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState('');

  const [enteredName, setEnteredName] = useState('');
  const [nameError, setNameError] = useState('');

  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const isContractor = profile?.role === 'contractor';

  const handleDocSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setDocPreview(URL.createObjectURL(file));
  };

  const handleSelfieSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const validateName = () => {
    const normalized = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!enteredName.trim()) {
      setNameError(isEs ? 'Ingresa tu nombre completo' : 'Enter your full name');
      return false;
    }
    if (normalized(enteredName) !== normalized(profile?.full_name || '')) {
      setNameError(isEs ? 'El nombre no coincide con tu cuenta. Verifica e intenta de nuevo.' : 'Name does not match your account. Please check and try again.');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = () => {
    if (!profile || !docFile || !docType) return;
    if (!validateName()) return;
    if (isContractor && !selfieFile) {
      showToast(isEs ? 'La selfie es obligatoria para contratistas' : 'Selfie is required for contractors', 'error');
      return;
    }

    onComplete();

    const bgSync = async () => {
      try {
        const docUrl = await uploadToBucket(docFile, profile.id, 'document');
        const selfUrl = selfieFile ? await uploadToBucket(selfieFile, profile.id, 'selfie') : null;

        await supabase
          .from('profiles')
          .update({
            document_type: docType,
            ...(docUrl ? { document_id_url: docUrl } : {}),
            ...(selfUrl ? { selfie_url: selfUrl } : {}),
            verification_status: 'pending',
          })
          .eq('id', profile.id);
      } catch {
        await supabase
          .from('profiles')
          .update({ document_type: docType, verification_status: 'pending' })
          .eq('id', profile.id)
          .then(() => {});
      }
      refreshProfile();
    };
    bgSync();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pixio-500 to-pixio-700 flex items-center justify-center px-6 py-12">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pixio-100 flex items-center justify-center">
            <ShieldCheck size={20} className="text-pixio-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-800">
              {isEs ? 'Verificacion de Identidad' : 'Identity Verification'}
            </h2>
            <p className="text-xs text-ink-500">
              {isEs ? 'Paso obligatorio para usar Pixio' : 'Required to use Pixio'}
            </p>
          </div>
        </div>

        {/* Step 1: Document Type */}
        {step === 'docType' && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600 mb-4">
              {isEs ? 'Selecciona el tipo de documento que vas a subir:' : 'Select the document type to upload:'}
            </p>
            {DOC_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDocType(opt.value)}
                  className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    docType === opt.value ? 'border-pixio-500 bg-pixio-50' : 'border-ink-200 hover:border-ink-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${docType === opt.value ? 'bg-pixio-500 text-white' : 'bg-ink-100 text-ink-500'}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`font-medium text-sm ${docType === opt.value ? 'text-pixio-700' : 'text-ink-700'}`}>
                    {isEs ? opt.labelEs : opt.labelEn}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              disabled={!docType}
              onClick={() => setStep('upload')}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {isEs ? 'Siguiente' : 'Next'} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Upload Document */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="label">
                {isEs ? 'Nombre completo (como aparece en tu ID)' : 'Full name (as it appears on your ID)'}
              </label>
              <input
                type="text"
                value={enteredName}
                onChange={(e) => { setEnteredName(e.target.value); setNameError(''); }}
                className={`input ${nameError ? 'border-danger-500 ring-1 ring-danger-500' : ''}`}
                placeholder={profile?.full_name || ''}
              />
              {nameError && (
                <p className="text-xs text-danger-500 mt-1">{nameError}</p>
              )}
            </div>
            <p className="text-sm text-ink-600">
              {isEs
                ? 'Sube una foto clara del frente de tu documento.'
                : 'Upload a clear photo of the front of your document.'}
            </p>
            <input ref={docInputRef} type="file" accept="image/*" capture="environment" onChange={handleDocSelect} className="hidden" />
            {docPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-ink-200">
                <img src={docPreview} alt="Document" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 shadow"
                >
                  {isEs ? 'Cambiar foto' : 'Change photo'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="w-full h-48 rounded-xl border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-400 hover:border-pixio-300 hover:text-pixio-500 transition-all"
              >
                <Upload size={32} />
                <span className="text-sm mt-2">{isEs ? 'Subir foto del documento' : 'Upload document photo'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={!docFile}
              onClick={() => {
                if (!isContractor) {
                  handleSubmit();
                } else {
                  setStep('selfie');
                }
              }}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isContractor
                ? (isEs ? 'Siguiente' : 'Next')
                : (isEs ? 'Enviar Verificacion' : 'Submit Verification')
              } {isContractor ? <ArrowRight size={16} /> : <ShieldCheck size={16} />}
            </button>
          </div>
        )}

        {/* Step 3: Selfie (contractors only) */}
        {step === 'selfie' && (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">
              {isEs
                ? 'Tomate una selfie rapida para verificar que eres la misma persona del documento.'
                : 'Take a quick selfie to verify you match your document.'}
            </p>
            <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={handleSelfieSelect} className="hidden" />
            {selfiePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-ink-200">
                <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-ink-700 shadow"
                >
                  {isEs ? 'Tomar otra' : 'Retake'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => selfieInputRef.current?.click()}
                className="w-full h-48 rounded-xl border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-400 hover:border-pixio-300 hover:text-pixio-500 transition-all"
              >
                <Camera size={32} />
                <span className="text-sm mt-2">{isEs ? 'Tomar selfie' : 'Take selfie'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={isContractor && !selfieFile}
              onClick={handleSubmit}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isEs ? 'Enviar Verificacion' : 'Submit Verification'} <ShieldCheck size={16} />
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {['docType', 'upload', 'selfie'].map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
              step === s ? 'bg-pixio-500' : i < ['docType', 'upload', 'selfie'].indexOf(step) ? 'bg-pixio-300' : 'bg-ink-200'
            }`} />
          ))}
        </div>
      </div>
    </div>
  );
}
