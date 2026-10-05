import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera, LogOut, Save, User, Briefcase, MessageCircle, MapPin, Plus, X, Building2, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/hooks';
import { getCategoryName, GENERAL_CONSTRUCTION, generalConstructionLabel } from '@/lib/categories';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Spinner, Avatar } from '@/components/ui';

interface ProfileSettingsProps {
  onBack: () => void;
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxW = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        0.8,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const { profile, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const fileRef = useRef<HTMLInputElement>(null);
  const isContractor = profile?.role === 'contractor';
  const { categories } = useCategories();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [companyName, setCompanyName] = useState(profile?.company_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [statusMessage, setStatusMessage] = useState(profile?.status_message ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [trades, setTrades] = useState<string[]>(profile?.trades ?? []);
  const [serviceZips, setServiceZips] = useState<string[]>(profile?.service_zips ?? []);
  const [newZip, setNewZip] = useState('');
  const [radius, setRadius] = useState<number>(profile?.service_radius_km ?? 20);
  const [isEnterprise, setIsEnterprise] = useState<boolean>(profile?.is_enterprise ?? false);
  const [acceptsSubcontracts, setAcceptsSubcontracts] = useState<boolean>(profile?.accepts_subcontracts ?? false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTrade = (slug: string) => {
    setTrades((prev) => (prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]));
  };

  const addZip = () => {
    const z = newZip.trim();
    if (!z || serviceZips.includes(z)) { setNewZip(''); return; }
    setServiceZips((prev) => [...prev, z]);
    setNewZip('');
  };

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile) return;
      setUploading(true);
      try {
        const compressed = await compressImage(file);
        const path = `${profile.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        const { error: dbErr } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', profile.id);
        if (dbErr) throw dbErr;

        setAvatarUrl(publicUrl);
        await refreshProfile();
        showToast(isEs ? 'Foto actualizada' : 'Photo updated', 'success');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : isEs ? 'Error al subir foto' : 'Upload failed',
          'error',
        );
      }
      setUploading(false);
    },
    [profile, refreshProfile, showToast, isEs],
  );

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      };

      if (isContractor) {
        updates.company_name = companyName.trim() || null;
        updates.bio = bio.trim() || null;
        updates.trades = trades;
        updates.service_zips = serviceZips;
        updates.service_radius_km = radius;
        updates.is_enterprise = isEnterprise;
        updates.accepts_subcontracts = isEnterprise ? acceptsSubcontracts : false;
      } else {
        updates.status_message = statusMessage.trim() || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);
      if (error) throw error;
      await refreshProfile();
      showToast(isEs ? 'Perfil guardado' : 'Profile saved', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : isEs ? 'Error al guardar' : 'Save failed',
        'error',
      );
    }
    setSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/80 backdrop-blur px-4 py-3 border-b border-ink-100">
        <button type="button" onClick={onBack} className="p-1 -ml-1 text-ink-600">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-ink-900">
          {isEs ? 'Configuracion' : 'Profile Settings'}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative group"
          >
            <Avatar url={avatarUrl} name={fullName} size={96} className="border-2 border-ink-100" />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <Spinner size={22} /> : <Camera size={22} className="text-white" />}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="text-xs text-ink-400">
            {isEs ? 'Toca para cambiar foto' : 'Tap to change photo'}
          </p>
        </div>

        {/* Role badge */}
        <div className="flex justify-center">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            isContractor
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-pixio-100 text-pixio-700'
          }`}>
            {isContractor ? <Briefcase size={12} /> : <User size={12} />}
            {isContractor
              ? (isEs ? 'Contratista' : 'Contractor')
              : (isEs ? 'Cliente' : 'Client')}
          </span>
        </div>

        {/* Form card */}
        <div className="card rounded-xl border border-ink-100 bg-white p-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="label text-xs font-medium text-ink-500 mb-1 block">
              {isEs ? 'Nombre completo' : 'Full Name'}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full"
              placeholder={isEs ? 'Tu nombre' : 'Your name'}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label text-xs font-medium text-ink-500 mb-1 block">
              {isEs ? 'Telefono' : 'Phone'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* ---- CLIENT-ONLY: Status / Personal Message ---- */}
          {!isContractor && (
            <div>
              <label className="label text-xs font-medium text-ink-500 mb-1 block">
                <MessageCircle size={12} className="inline mr-1" />
                {isEs ? 'Estado / Mensaje personal' : 'Status / Personal Message'}
              </label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="input w-full"
                maxLength={120}
                placeholder={isEs ? 'Ej. Buscando remodelacion de cocina' : 'e.g. Looking for kitchen remodel'}
              />
              <p className="text-[10px] text-ink-400 mt-1 text-right">{statusMessage.length}/120</p>
            </div>
          )}

          {/* ---- CONTRACTOR-ONLY FIELDS ---- */}
          {isContractor && (
            <>
              <div className="border-t border-ink-100 pt-4 mt-2">
                <p className="text-xs font-semibold text-emerald-600 mb-3 uppercase tracking-wide">
                  {isEs ? 'Informacion de Empresa' : 'Business Information'}
                </p>
              </div>

              {/* Company Name */}
              <div>
                <label className="label text-xs font-medium text-ink-500 mb-1 block">
                  {isEs ? 'Nombre de empresa / oficio' : 'Company / Trade Name'}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input w-full"
                  placeholder={isEs ? 'Ej. Giles Constructores' : 'e.g. Smith Renovations'}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="label text-xs font-medium text-ink-500 mb-1 block">
                  {isEs ? 'Descripcion / Bio de Empresa' : 'Company Bio / Experience'}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input w-full min-h-[100px] resize-y"
                  maxLength={500}
                  placeholder={
                    isEs
                      ? 'Describe tu experiencia, especialidades y lo que te distingue'
                      : 'Describe your experience, specialties, and what sets you apart'
                  }
                />
                <p className="text-[10px] text-ink-400 mt-1 text-right">{bio.length}/500</p>
              </div>

              {/* Trades & Specialties multi-select */}
              <div>
                <label className="label text-xs font-medium text-ink-500 mb-2 block">
                  {isEs ? 'Oficios y Especialidades' : 'Trades & Specialties'}
                  <span className="text-ink-400 font-normal ml-1">
                    ({trades.length} {isEs ? 'seleccionados' : 'selected'})
                  </span>
                </label>

                {/* General Construction primary option */}
                <button
                  type="button"
                  onClick={() => toggleTrade(GENERAL_CONSTRUCTION)}
                  className={`w-full flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 mb-2 text-sm font-semibold transition-all ${
                    trades.includes(GENERAL_CONSTRUCTION)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-ink-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <Building2 size={16} />
                  {generalConstructionLabel(i18n.language)}
                  <span className="text-[10px] font-normal text-ink-400 ml-auto">
                    {isEs ? 'Todos los oficios' : 'All trades'}
                  </span>
                  {trades.includes(GENERAL_CONSTRUCTION) && <Check size={16} className="text-emerald-600" />}
                </button>

                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const active = trades.includes(cat.slug);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => toggleTrade(cat.slug)}
                        className={`text-[11px] rounded-full px-2.5 py-1 font-medium border transition-all ${
                          active
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-ink-600 border-ink-200 hover:border-emerald-300'
                        }`}
                      >
                        {getCategoryName(cat, i18n.language)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service areas: multiple ZIP codes */}
              <div>
                <label className="label text-xs font-medium text-ink-500 mb-2 block">
                  <MapPin size={12} className="inline mr-1" />
                  {isEs ? 'Zonas de servicio (codigos postales)' : 'Service Areas (ZIP codes)'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newZip}
                    onChange={(e) => setNewZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZip(); } }}
                    className="input flex-1"
                    placeholder="90210"
                  />
                  <button
                    type="button"
                    onClick={addZip}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-3 text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <Plus size={16} />
                    {isEs ? 'Agregar' : 'Add'}
                  </button>
                </div>
                {serviceZips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {serviceZips.map((z) => (
                      <span key={z} className="inline-flex items-center gap-1 text-[11px] bg-ink-100 text-ink-700 rounded-full pl-2.5 pr-1 py-0.5 font-medium">
                        {z}
                        <button
                          type="button"
                          onClick={() => setServiceZips((prev) => prev.filter((v) => v !== z))}
                          className="rounded-full hover:bg-ink-200 p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-ink-400 mt-1.5">
                  {isEs
                    ? 'Agrega varios codigos postales para cobertura regional / multi-condado.'
                    : 'Add multiple ZIP codes for regional / multi-county coverage.'}
                </p>
              </div>

              {/* Service radius */}
              <div>
                <label className="label text-xs font-medium text-ink-500 mb-1 block">
                  {isEs ? 'Radio de servicio' : 'Service Radius'}
                </label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="input w-full"
                >
                  {[10, 20, 50, 100, 250].map((km) => (
                    <option key={km} value={km}>{km} km{km >= 250 ? (isEs ? ' (regional)' : ' (regional)') : ''}</option>
                  ))}
                </select>
              </div>

              {/* Enterprise tier */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsEnterprise((v) => !v)}
                  className="w-full flex items-start gap-2.5 text-left"
                >
                  <span className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isEnterprise ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300 bg-white'
                  }`}>
                    {isEnterprise && <Check size={13} className="text-white" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-800">
                      {isEs ? 'Cuenta Empresa / Gran Contratista' : 'Enterprise / Large Company'}
                    </span>
                    <span className="block text-[11px] text-ink-500 mt-0.5">
                      {isEs
                        ? 'Cobertura regional multi-condado y acceso a proyectos grandes.'
                        : 'Multi-county regional coverage and access to large projects.'}
                    </span>
                  </span>
                </button>

                {isEnterprise && (
                  <button
                    type="button"
                    onClick={() => setAcceptsSubcontracts((v) => !v)}
                    className="w-full flex items-start gap-2.5 text-left pl-7"
                  >
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      acceptsSubcontracts ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300 bg-white'
                    }`}>
                      {acceptsSubcontracts && <Check size={13} className="text-white" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink-800">
                        {isEs ? 'Publicar sub-contratos' : 'Post sub-contracts'}
                      </span>
                      <span className="block text-[11px] text-ink-500 mt-0.5">
                        {isEs
                          ? 'Recibe trabajos grandes y asigna partes a contratistas especializados.'
                          : 'Receive large jobs and assign portions to specialized contractors.'}
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-2"
          >
            {saving ? (
              <Spinner size={16} />
            ) : (
              <>
                <Save size={16} />
                {isEs ? 'Guardar cambios' : 'Save Changes'}
              </>
            )}
          </button>
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() => signOut()}
          className="btn-danger w-full flex items-center justify-center gap-2 text-sm"
        >
          <LogOut size={16} />
          {isEs ? 'Cerrar sesion' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
