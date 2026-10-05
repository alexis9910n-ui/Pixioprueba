import { useState, useRef, useEffect, useCallback, type FormEvent, type ChangeEvent, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/hooks';
import { getCategoryName, getGroupLabel, groupCategories } from '@/lib/categories';

import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import {
  ArrowLeft, X, ImagePlus, Crosshair,
  FileText, Loader2, ChevronDown,
} from 'lucide-react';
import { VoiceRecorder } from '@/components/shared/VoiceRecorder';

import L from 'leaflet';

const MAX_FILES = 8;
const MAX_FILE_MB = 10;
const COMPRESSED_MAX_WIDTH = 1600;
const COMPRESSED_QUALITY = 0.75;
const DEFAULT_CENTER: [number, number] = [25.7617, -80.1918];
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

interface UploadedFile {
  name: string;
  type: string;
  previewUrl: string;
  storageUrl?: string;
  uploading: boolean;
  error?: string;
}

/* ---------- helpers ---------- */

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') { resolve(file); return; }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Cannot load image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > COMPRESSED_MAX_WIDTH) {
          height = Math.round(height * (COMPRESSED_MAX_WIDTH / width));
          width = COMPRESSED_MAX_WIDTH;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg',
          COMPRESSED_QUALITY,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadToStorage(
  file: File,
  userId: string,
): Promise<string> {
  const compressed = await compressImage(file);
  const ext = file.type === 'application/pdf' ? 'pdf' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('job-photos').upload(path, compressed, {
    contentType: file.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path);
  return urlData.publicUrl;
}

/* ---------- Nominatim search ---------- */

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (query.length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es,en' } });
  if (!res.ok) return [];
  return res.json();
}



/* ---------- LocationMap ---------- */

function LocationMap({
  lat, lng, onLocationChangeRef,
}: {
  lat: number | null;
  lng: number | null;
  onLocationChangeRef: MutableRefObject<(lat: number, lng: number) => void>;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const placeMarker = useCallback((map: L.Map, newLat: number, newLng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
    } else {
      markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (pos) onLocationChangeRef.current(pos.lat, pos.lng);
      });
    }
  }, [onLocationChangeRef]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: lat && lng ? [lat, lng] : DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) placeMarker(map, lat, lng);

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(map, e.latlng.lat, e.latlng.lng);
      onLocationChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    const invalidate = () => { map.invalidateSize(); };
    window.addEventListener('resize', invalidate);
    window.addEventListener('scroll', invalidate, true);
    const ro = new ResizeObserver(invalidate);
    if (mapRef.current) ro.observe(mapRef.current);
    const t1 = setTimeout(invalidate, 300);
    const t2 = setTimeout(invalidate, 1000);

    return () => {
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('scroll', invalidate, true);
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || lat == null || lng == null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
    placeMarker(map, lat, lng);
  }, [lat, lng, placeMarker]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocationChangeRef.current(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true },
    );
  }, [onLocationChangeRef]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label mb-0">{isEs ? 'Ubicacion en el Mapa' : 'Location on Map'}</label>
        <button type="button" onClick={handleGeolocate}
          className="flex items-center gap-1.5 text-xs text-pixio-600 font-medium hover:text-pixio-700 transition-colors">
          <Crosshair size={14} />
          {isEs ? 'Usar mi ubicacion' : 'Use my location'}
        </button>
      </div>
      <div ref={mapRef} className="h-52 rounded-xl overflow-hidden border border-ink-200 z-0" />
      <p className="text-xs text-ink-400">
        {isEs
          ? 'Toca el mapa o arrastra el pin para ajustar la ubicacion exacta.'
          : 'Tap the map or drag the pin to adjust the exact location.'}
      </p>
    </div>
  );
}

/* ---------- FileUploadArea ---------- */

function FileUploadArea({
  files, onAdd, onRemove, uploading,
}: {
  files: UploadedFile[];
  onAdd: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
  uploading: boolean;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="label">
        {isEs ? 'Fotos y Planos' : 'Photos & Plans'}
        <span className="text-xs text-ink-400 ml-2">({files.length}/{MAX_FILES})</span>
      </label>
      <p className="text-xs text-ink-400 mb-2">
        {isEs
          ? 'JPEG, PNG o PDF. Max 10 MB cada uno.'
          : 'JPEG, PNG or PDF. Max 10 MB each.'}
      </p>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={onAdd} className="hidden" />
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div key={i} className="w-20 h-20 rounded-xl relative overflow-hidden group border border-ink-200 bg-ink-50 flex items-center justify-center">
            {f.uploading ? (
              <Loader2 size={20} className="text-ink-400 animate-spin" />
            ) : f.type === 'application/pdf' ? (
              <div className="flex flex-col items-center">
                <FileText size={24} className="text-danger-500" />
                <span className="text-[9px] text-ink-500 mt-0.5 truncate max-w-[72px] px-1">{f.name}</span>
              </div>
            ) : (
              <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
            )}
            {!f.uploading && (
              <button type="button" onClick={() => onRemove(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink-800/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            )}
            {f.error && (
              <div className="absolute inset-0 bg-danger-500/80 flex items-center justify-center">
                <X size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {files.length < MAX_FILES && !uploading && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-ink-200 flex flex-col items-center justify-center text-ink-400 hover:border-pixio-300 hover:text-pixio-500 transition-all">
            <ImagePlus size={20} />
            <span className="text-[10px] mt-1">{isEs ? 'Agregar' : 'Add'}</span>
          </button>
        )}
      </div>
    </div>
  );
}



/* ---------- Main Component ---------- */

export function NewRequest() {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { navigate, goBack } = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { categories } = useCategories();

  const grouped = groupCategories(categories);

  const [categorySlug, setCategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [urgency, setUrgency] = useState('standard');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCat = categories.find((c) => c.slug === categorySlug);


  /* ---- location change ---- */
  const handleLocationChange = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        setStreet((prev) => prev.trim() ? prev : [a.house_number, a.road].filter(Boolean).join(' '));
        setCity((prev) => prev.trim() ? prev : (a.city || a.town || a.village || ''));
        setState((prev) => prev.trim() ? prev : (a.state || ''));
        setZipCode((prev) => prev.trim() ? prev : (a.postcode || ''));
      }
    } catch { /* ignore */ }
  }, []);
  const locationChangeRef = useRef(handleLocationChange);
  locationChangeRef.current = handleLocationChange;

  /* ---- file handling ---- */
  const handleFileAdd = async (e: ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files;
    if (!incoming || !profile) return;

    for (const file of Array.from(incoming)) {
      if (files.length >= MAX_FILES) {
        showToast(`Max ${MAX_FILES} ${isEs ? 'archivos' : 'files'}`, 'error');
        break;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        showToast(isEs ? 'Solo JPEG, PNG o PDF' : 'Only JPEG, PNG or PDF', 'error');
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        showToast(`Max ${MAX_FILE_MB} MB`, 'error');
        continue;
      }

      const preview = file.type === 'application/pdf'
        ? ''
        : URL.createObjectURL(file);

      const entry: UploadedFile = {
        name: file.name,
        type: file.type,
        previewUrl: preview,
        uploading: true,
      };

      setFiles((prev) => [...prev, entry]);
      const idx = files.length;

      try {
        const url = await uploadToStorage(file, profile.id);
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, uploading: false, storageUrl: url } : f)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, uploading: false, error: msg } : f)),
        );
        showToast(msg, 'error');
      }
    }
    if (e.target) e.target.value = '';
  };

  const handleFileRemove = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const anyUploading = files.some((f) => f.uploading);

  /* ---- validation ---- */
  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    if (!categorySlug) e.category = true;
    if (!title.trim()) e.title = true;
    if (!description.trim()) e.description = true;
    if (!street.trim()) e.street = true;
    setErrors(e);
    if (Object.keys(e).length > 0) {
      showToast(
        isEs ? 'Completa todos los campos obligatorios' : 'Please fill all required fields',
        'error',
      );
      return false;
    }
    return true;
  };

  /* ---- submit ---- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !validate()) return;
    if (anyUploading) {
      showToast(isEs ? 'Espera a que terminen de subir los archivos' : 'Wait for uploads to finish', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const imageUrls = files.filter((f) => f.storageUrl && !f.error).map((f) => f.storageUrl!);
      const { error } = await supabase
        .from('job_requests')
        .insert({
          client_id: profile.id,
          category: categorySlug,
          title: title.trim(),
          description: description.trim(),
          zip_code: zipCode.trim() || '',
          image_urls: imageUrls,
          audio_note_url: audioUrl,
          status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        showToast(
          error.message.includes('policy')
            ? (isEs ? 'No tienes permiso. Verifica tu sesion.' : 'Permission error. Check your session.')
            : `Error: ${error.message}`,
          'error',
        );
      } else {
        showToast(t('client.newRequest.success'), 'success');
        navigate('projects');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(
        isEs
          ? `No se pudo conectar al servidor. (${msg})`
          : `Could not connect. (${msg})`,
        'error',
      );
    }
    setSubmitting(false);
  };

  const errCls = (field: string) => errors[field] ? 'ring-2 ring-danger-500 ring-offset-1' : '';

  return (
    <div className="animate-fade-in min-h-screen bg-ink-50 flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
          <ArrowLeft size={20} className="text-ink-600" />
        </button>
        <h1 className="font-semibold text-ink-800">{t('client.newRequest.title')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pt-6 pb-32 space-y-5 max-w-2xl mx-auto w-full">

        {/* ---- Category dropdown ---- */}
        <div className="relative">
          <label className="label">{t('client.newRequest.category')} <span className="text-danger-500">*</span></label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`input w-full flex items-center justify-between text-left ${errCls('category')} ${!selectedCat ? 'text-ink-400' : 'text-ink-800'}`}
          >
            <span>{selectedCat ? getCategoryName(selectedCat, i18n.language) : (isEs ? 'Selecciona un servicio' : 'Select a service')}</span>
            <ChevronDown size={18} className={`text-ink-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-ink-100 max-h-72 overflow-y-auto">
                {Object.entries(grouped).map(([group, cats]) => (
                  <div key={group}>
                    <div className="px-4 py-2 bg-ink-50 text-xs font-bold text-ink-500 uppercase tracking-wide sticky top-0">
                      {getGroupLabel(group, i18n.language)}
                    </div>
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategorySlug(cat.slug);
                          setDropdownOpen(false);
                          setErrors((p) => ({ ...p, category: false }));
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          categorySlug === cat.slug
                            ? 'bg-pixio-50 text-pixio-700 font-medium'
                            : 'text-ink-700 hover:bg-ink-50'
                        }`}
                      >
                        {getCategoryName(cat, i18n.language)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ---- Title ---- */}
        <div>
          <label className="label">{t('client.newRequest.title_label')} <span className="text-danger-500">*</span></label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: false })); }}
            className={`input ${errCls('title')}`}
            placeholder={t('client.newRequest.titlePlaceholder')}
          />
          {errors.title && (
            <p className="text-xs text-danger-500 mt-1">{isEs ? 'El titulo es obligatorio' : 'Title is required'}</p>
          )}
        </div>

        {/* ---- Description ---- */}
        <div>
          <label className="label">{t('client.newRequest.description')} <span className="text-danger-500">*</span></label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: false })); }}
            className={`input min-h-[120px] resize-y ${errCls('description')}`}
            placeholder={t('client.newRequest.descriptionPlaceholder')}
          />
          {errors.description && (
            <p className="text-xs text-danger-500 mt-1">{isEs ? 'La descripcion es obligatoria' : 'Description is required'}</p>
          )}
        </div>

        {/* ---- Budget ---- */}
        <div>
          <label className="label">{t('client.newRequest.budget')}</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="input"
            placeholder="$"
            min="0"
            step="0.01"
          />

        </div>

        {/* ---- US Address: Zip, Street, City, State ---- */}
        <div>
          <label className="label">{isEs ? 'Codigo Postal (Zip Code)' : 'Zip Code'} <span className="text-danger-500">*</span></label>
          <input
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            onBlur={async () => {
              const z = zipCode.trim();
              if (/^\d{5}$/.test(z)) {
                const results = await searchAddress(`${z}, United States`);
                if (results.length > 0) {
                  const r = results[0];
                  const lat = parseFloat(r.lat);
                  const lng = parseFloat(r.lon);
                  setLatitude(lat);
                  setLongitude(lng);
                  try {
                    const res = await fetch(
                      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                      { headers: { 'Accept-Language': 'en' } },
                    );
                    if (res.ok) {
                      const data = await res.json();
                      const a = data.address || {};
                      if (!city.trim()) setCity(a.city || a.town || a.village || '');
                      if (!state.trim()) setState(a.state || '');
                    }
                  } catch { /* ignore */ }
                }
              }
            }}
            className="input"
            placeholder="97702"
            maxLength={5}
          />
        </div>

        <div>
          <label className="label">{isEs ? 'Direccion / Calle' : 'Street Address'} <span className="text-danger-500">*</span></label>
          <input
            value={street}
            onChange={(e) => { setStreet(e.target.value); setErrors((p) => ({ ...p, street: false })); }}
            className={`input ${errCls('street')}`}
            placeholder={isEs ? 'Ej. 61550 Brosterhouse Rd' : 'e.g. 61550 Brosterhouse Rd'}
          />
          {errors.street && (
            <p className="text-xs text-danger-500 mt-1">{isEs ? 'La direccion es obligatoria' : 'Street address is required'}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{isEs ? 'Ciudad' : 'City'}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input"
              placeholder={isEs ? 'Ej. Bend' : 'e.g. Bend'}
            />
          </div>
          <div>
            <label className="label">{isEs ? 'Estado' : 'State'}</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="input"
              placeholder={isEs ? 'Ej. Oregon' : 'e.g. Oregon'}
            />
          </div>
        </div>

        {/* ---- Map ---- */}
        <LocationMap lat={latitude} lng={longitude} onLocationChangeRef={locationChangeRef} />

        {/* ---- Urgency ---- */}
        <div>
          <label className="label">{t('client.newRequest.urgency')}</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'standard' as Urgency, label: isEs ? 'A convenir' : 'Flexible', color: 'pixio' },
              { value: 'urgent' as Urgency, label: isEs ? 'Esta semana' : 'This week', color: 'warning' },
              { value: 'emergency' as Urgency, label: isEs ? 'Inmediato' : 'Immediate', color: 'danger' },
            ]).map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUrgency(u.value)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  urgency === u.value
                    ? u.color === 'danger' ? 'border-danger-500 bg-danger-50 text-danger-600'
                      : u.color === 'warning' ? 'border-warning-500 bg-warning-50 text-warning-600'
                      : 'border-pixio-500 bg-pixio-50 text-pixio-600'
                    : 'border-ink-100 bg-white text-ink-500'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Voice note ---- */}
        {profile && (
          <VoiceRecorder userId={profile.id} audioUrl={audioUrl} onAudioChange={setAudioUrl} />
        )}

        {/* ---- File upload ---- */}
        <FileUploadArea
          files={files}
          onAdd={handleFileAdd}
          onRemove={handleFileRemove}
          uploading={anyUploading}
        />

        {/* ---- Submit ---- */}
        <button
          type="submit"
          disabled={submitting || anyUploading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Spinner size={18} />
              <span>{isEs ? 'Publicando...' : 'Publishing...'}</span>
            </>
          ) : anyUploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{isEs ? 'Subiendo archivos...' : 'Uploading files...'}</span>
            </>
          ) : (
            t('client.newRequest.submit')
          )}
        </button>
      </form>
    </div>
  );
}
