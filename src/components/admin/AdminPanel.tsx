import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { useCategories } from '@/lib/hooks';
import { getCategoryName } from '@/lib/categories';
import { getIcon } from '@/lib/icons';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Spinner } from '@/components/ui';
import {
  ArrowLeft, Users, Wrench, FileText, ShieldCheck,
  CheckCircle2, XCircle, Eye, Activity, RefreshCw,
  Bell, DollarSign, AlertTriangle, ImagePlus, Trash2, Image,
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'categories' | 'alerts';

interface Stats {
  totalUsers: number;
  totalContractors: number;
  activeRequests: number;
}

interface PendingVerification {
  id: string;
  full_name: string;
  email: string;
  document_type: string | null;
  document_id_url: string | null;
  selfie_url: string | null;
  verification_status: string;
  created_at: string;
}

interface AdminAlert {
  id: string;
  alert_type: string;
  title: string;
  description: string;
  project_id: string | null;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface CategoryImage {
  id: string;
  category_name: string;
  image_url: string;
  display_order: number;
}

export function AdminPanel() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { goBack } = useNavigate();
  const { profile } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');

  if (profile?.role !== 'admin') return null;

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: isEs ? 'General' : 'Overview', icon: <Activity size={16} /> },
    { key: 'users', label: isEs ? 'Usuarios' : 'Users', icon: <Users size={16} /> },
    { key: 'categories', label: isEs ? 'Categorias' : 'Categories', icon: <Image size={16} /> },
    { key: 'alerts', label: isEs ? 'Alertas' : 'Alerts', icon: <Bell size={16} /> },
  ];

  return (
    <div className="animate-fade-in min-h-screen bg-ink-50">
      <div className="sticky top-0 z-30 bg-white border-b border-ink-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-ink-100">
            <ArrowLeft size={20} className="text-ink-600" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-pixio-600" />
            <h1 className="font-semibold text-ink-800">
              {isEs ? 'Panel Modo Creador' : 'Creator Mode Panel'}
            </h1>
          </div>
        </div>
        <div className="flex gap-1 px-4 pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === t.key ? 'bg-pixio-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-3xl mx-auto pb-20">
        {tab === 'overview' && <OverviewTab isEs={isEs} />}
        {tab === 'users' && <UsersTab isEs={isEs} />}
        {tab === 'categories' && <CategoriesTab isEs={isEs} />}
        {tab === 'alerts' && <AlertsTab isEs={isEs} />}
      </div>
    </div>
  );
}

/* =================== OVERVIEW TAB =================== */
function OverviewTab({ isEs }: { isEs: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'ok' | 'error' | 'checking'>('checking');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, contractorsRes, requestsRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'contractor'),
        supabase.from('job_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('profiles').select('id, full_name, email, document_type, document_id_url, selfie_url, verification_status, created_at')
          .in('verification_status', ['pending'])
          .not('document_id_url', 'is', null)
          .order('created_at', { ascending: false }),
      ]);
      setStats({
        totalUsers: usersRes.count || 0,
        totalContractors: contractorsRes.count || 0,
        activeRequests: requestsRes.count || 0,
      });
      setPending((pendingRes.data || []) as PendingVerification[]);
      setDbStatus('ok');
    } catch {
      setDbStatus('error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (userId: string, approve: boolean) => {
    setProcessingId(userId);
    await supabase.from('profiles').update({
      verification_status: approve ? 'verified' : 'unverified',
      verified_at: approve ? new Date().toISOString() : null,
    }).eq('id', userId);
    setPending((prev) => prev.filter((p) => p.id !== userId));
    setProcessingId(null);
  };

  return (
    <div className="space-y-5">
      {loading && !stats ? (
        <div className="flex justify-center py-10"><Spinner className="text-pixio-500" size={24} /></div>
      ) : stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Users size={20} />} label={isEs ? 'Usuarios' : 'Users'} value={stats.totalUsers} color="pixio" />
          <StatCard icon={<Wrench size={20} />} label={isEs ? 'Contratistas' : 'Contractors'} value={stats.totalContractors} color="accent" />
          <StatCard icon={<FileText size={20} />} label={isEs ? 'Solicitudes' : 'Requests'} value={stats.activeRequests} color="warning" />
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Activity size={18} className="text-ink-500" />
          <span className="text-sm font-medium text-ink-700">{isEs ? 'Estado del Servidor' : 'Server Status'}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'ok' ? 'bg-green-500 animate-pulse' : dbStatus === 'error' ? 'bg-danger-500' : 'bg-warning-400 animate-pulse'}`} />
            <span className={`text-xs font-medium ${dbStatus === 'ok' ? 'text-green-600' : dbStatus === 'error' ? 'text-danger-600' : 'text-warning-600'}`}>
              {dbStatus === 'ok' ? (isEs ? 'Conectado' : 'Connected') : dbStatus === 'error' ? 'Error' : (isEs ? 'Verificando...' : 'Checking...')}
            </span>
          </span>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-ink-800 mb-3 flex items-center gap-2">
          <ShieldCheck size={18} className="text-pixio-600" />
          {isEs ? 'Verificacion de Identidades' : 'Identity Verification'}
          {pending.length > 0 && (
            <span className="ml-2 text-xs bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
          )}
        </h2>

        {pending.length === 0 ? (
          <div className="card p-6 text-center">
            <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-ink-500">{isEs ? 'No hay verificaciones pendientes' : 'No pending verifications'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((user) => (
              <div key={user.id} className="card p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-pixio-100 text-pixio-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {user.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-800 text-sm">{user.full_name}</p>
                    <p className="text-xs text-ink-400 truncate">{user.email}</p>
                    {user.document_type && (
                      <span className="text-xs text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full mt-1 inline-block">{user.document_type}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  {user.document_id_url && (
                    <button type="button" onClick={() => setPreviewUrl(user.document_id_url)}
                      className="flex-1 h-24 rounded-lg border border-ink-200 overflow-hidden bg-ink-50 relative group">
                      <img src={user.document_id_url} alt="ID" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  )}
                  {user.selfie_url && (
                    <button type="button" onClick={() => setPreviewUrl(user.selfie_url)}
                      className="flex-1 h-24 rounded-lg border border-ink-200 overflow-hidden bg-ink-50 relative group">
                      <img src={user.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleVerify(user.id, true)} disabled={processingId === user.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors active:scale-95">
                    {processingId === user.id ? <Spinner size={16} /> : <CheckCircle2 size={18} />}
                    {isEs ? 'Aprobar' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => handleVerify(user.id, false)} disabled={processingId === user.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-danger-500 text-white font-semibold text-sm hover:bg-danger-600 transition-colors active:scale-95">
                    {processingId === user.id ? <Spinner size={16} /> : <XCircle size={18} />}
                    {isEs ? 'Rechazar' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <button type="button" onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <XCircle size={24} />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

/* =================== USERS TAB =================== */
interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: string;
  verification_status: string;
  company_name: string | null;
  license_number: string | null;
  phone: string | null;
  document_id_url: string | null;
  selfie_url: string | null;
  created_at: string;
}

function UsersTab({ isEs }: { isEs: boolean }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'contractor' | 'client'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, verification_status, company_name, license_number, phone, document_id_url, selfie_url, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Admin] fetchUsers:', error.message);
      showToast(error.message, 'error');
    }
    setUsers((data || []) as UserRecord[]);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Realtime: auto-refresh when profiles change
  useEffect(() => {
    const channel = supabase
      .channel('admin-profiles')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchUsers(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUsers]);

  const handleVerify = async (userId: string, newStatus: 'verified' | 'rejected' | 'unverified') => {
    setProcessingId(userId);
    const { error } = await supabase.from('profiles').update({
      verification_status: newStatus,
      verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
    }).eq('id', userId);
    if (error) {
      console.error('[Admin] handleVerify:', error.message);
      showToast(error.message, 'error');
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, verification_status: newStatus } : u));
      const msg = newStatus === 'verified'
        ? (isEs ? 'Usuario verificado' : 'User verified')
        : newStatus === 'rejected'
        ? (isEs ? 'Verificacion rechazada' : 'Verification rejected')
        : (isEs ? 'Verificacion revocada' : 'Verification revoked');
      showToast(msg, 'success');
    }
    setProcessingId(null);
  };

  const filtered = users.filter((u) => {
    if (filter === 'pending') return u.verification_status === 'pending';
    if (filter === 'verified') return u.verification_status === 'verified';
    if (filter === 'contractor') return u.role === 'contractor';
    if (filter === 'client') return u.role === 'client';
    return true;
  });

  const pendingCount = users.filter((u) => u.verification_status === 'pending').length;

  const roleLabel = (role: string) => {
    const map: Record<string, { es: string; en: string }> = {
      client: { es: 'Cliente', en: 'Client' },
      contractor: { es: 'Contratista', en: 'Contractor' },
      admin: { es: 'Admin', en: 'Admin' },
    };
    return isEs ? (map[role]?.es || role) : (map[role]?.en || role);
  };

  const statusColor = (s: string) => {
    if (s === 'verified') return 'bg-green-50 text-green-700 border-green-200';
    if (s === 'pending') return 'bg-warning-50 text-warning-700 border-warning-200';
    if (s === 'rejected') return 'bg-danger-50 text-danger-700 border-danger-200';
    return 'bg-ink-100 text-ink-600 border-ink-200';
  };

  const roleColor = (r: string) => {
    if (r === 'contractor') return 'bg-pixio-50 text-pixio-700';
    if (r === 'admin') return 'bg-purple-50 text-purple-700';
    return 'bg-ink-50 text-ink-600';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-ink-800 flex items-center gap-2">
          <Users size={18} className="text-pixio-600" />
          {isEs ? 'Todos los Usuarios' : 'All Users'}
          <span className="text-xs bg-ink-100 text-ink-500 px-2 py-0.5 rounded-full font-bold">{users.length}</span>
          {pendingCount > 0 && (
            <span className="text-xs bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-bold">{pendingCount} {isEs ? 'pendientes' : 'pending'}</span>
          )}
        </h2>
        <button type="button" onClick={fetchUsers} disabled={loading} className="p-2 rounded-lg hover:bg-ink-100 transition-colors">
          <RefreshCw size={16} className={`text-ink-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {[
          { key: 'all' as const, label: isEs ? 'Todos' : 'All' },
          { key: 'pending' as const, label: isEs ? 'Pendientes' : 'Pending' },
          { key: 'verified' as const, label: isEs ? 'Verificados' : 'Verified' },
          { key: 'contractor' as const, label: isEs ? 'Contratistas' : 'Contractors' },
          { key: 'client' as const, label: isEs ? 'Clientes' : 'Clients' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              filter === f.key ? 'bg-pixio-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="text-pixio-500" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-center">
          <Users size={32} className="text-ink-300 mx-auto mb-2" />
          <p className="text-sm text-ink-500">{isEs ? 'No se encontraron usuarios' : 'No users found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-pixio-100 text-pixio-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink-800 text-sm">{user.full_name}</p>
                    <span className={`badge text-[10px] ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
                    <span className={`badge text-[10px] border ${statusColor(user.verification_status)}`}>
                      {user.verification_status === 'verified' ? (isEs ? 'Verificado' : 'Verified')
                        : user.verification_status === 'pending' ? (isEs ? 'Pendiente' : 'Pending')
                        : user.verification_status === 'rejected' ? (isEs ? 'Rechazado' : 'Rejected')
                        : (isEs ? 'Sin verificar' : 'Unverified')}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-ink-400">{user.phone}</p>}
                  {user.company_name && (
                    <p className="text-xs text-pixio-600 mt-0.5">{user.company_name} {user.license_number ? `(${user.license_number})` : ''}</p>
                  )}
                  <p className="text-[10px] text-ink-300 mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Document preview */}
              {(user.document_id_url || user.selfie_url) && (
                <div className="flex gap-2 mt-3">
                  {user.document_id_url && (
                    <button type="button" onClick={() => setPreviewUrl(user.document_id_url)}
                      className="flex-1 h-20 rounded-lg border border-ink-200 overflow-hidden bg-ink-50 relative group">
                      <img src={user.document_id_url} alt="ID" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  )}
                  {user.selfie_url && (
                    <button type="button" onClick={() => setPreviewUrl(user.selfie_url)}
                      className="flex-1 h-20 rounded-lg border border-ink-200 overflow-hidden bg-ink-50 relative group">
                      <img src={user.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Verification actions */}
              {user.role !== 'admin' && (user.verification_status === 'pending' || user.verification_status === 'unverified') && (
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => handleVerify(user.id, 'verified')} disabled={processingId === user.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-xs hover:bg-green-600 transition-colors active:scale-95">
                    {processingId === user.id ? <Spinner size={14} /> : <CheckCircle2 size={16} />}
                    {isEs ? 'Aprobar' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => handleVerify(user.id, 'rejected')} disabled={processingId === user.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-500 text-white font-semibold text-xs hover:bg-danger-600 transition-colors active:scale-95">
                    {processingId === user.id ? <Spinner size={14} /> : <XCircle size={16} />}
                    {isEs ? 'Rechazar' : 'Reject'}
                  </button>
                </div>
              )}
              {user.verification_status === 'rejected' && user.role !== 'admin' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-danger-600">
                  <XCircle size={14} />
                  <span className="font-medium">{isEs ? 'Verificacion rechazada' : 'Verification rejected'}</span>
                  <button type="button" onClick={() => handleVerify(user.id, 'verified')} className="ml-auto text-[10px] text-ink-400 hover:text-green-600 transition-colors">
                    {isEs ? 'Aprobar' : 'Approve'}
                  </button>
                </div>
              )}
              {user.verification_status === 'verified' && user.role !== 'admin' && (
                <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle2 size={14} />
                  <span className="font-medium">{isEs ? 'Identidad verificada' : 'Identity verified'}</span>
                  <button type="button" onClick={() => handleVerify(user.id, 'unverified')} className="ml-auto text-[10px] text-ink-400 hover:text-danger-500 transition-colors">
                    {isEs ? 'Revocar' : 'Revoke'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <button type="button" onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <XCircle size={24} />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

/* =================== CATEGORIES TAB =================== */
function CategoriesTab({ isEs }: { isEs: boolean }) {
  const { categories } = useCategories();
  const { showToast } = useToast();
  const [images, setImages] = useState<CategoryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCatRef = useRef<string>('');

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('category_gallery').select('*').order('display_order');
    setImages((data || []) as CategoryImage[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadCatRef.current) return;
    const catId = uploadCatRef.current;
    setUploading(catId);
    try {
      const path = `${catId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
      const { error } = await supabase.storage.from('category-images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { data: urlData } = supabase.storage.from('category-images').getPublicUrl(path);
      const currentCount = images.filter((img) => img.category_name === catId).length;
      await supabase.from('category_gallery').insert({
        category_name: catId,
        image_url: urlData.publicUrl,
        display_order: currentCount,
      });
      showToast(isEs ? 'Imagen subida' : 'Image uploaded', 'success');
      fetchImages();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
    setUploading(null);
    if (e.target) e.target.value = '';
  };

  const handleDelete = async (img: CategoryImage) => {
    await supabase.from('category_gallery').delete().eq('id', img.id);
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    showToast(isEs ? 'Imagen eliminada' : 'Image removed', 'success');
  };

  const triggerUpload = (catId: string) => {
    uploadCatRef.current = catId;
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <h2 className="font-semibold text-ink-800 mb-1 flex items-center gap-2">
        <Image size={18} className="text-pixio-600" />
        {isEs ? 'Imagenes de Ejemplo por Categoria' : 'Category Example Images'}
      </h2>
      <p className="text-xs text-ink-500 mb-4">
        {isEs ? 'Sube fotos de ejemplo para cada oficio (max 4 por categoria)' : 'Upload example photos per trade (max 4 per category)'}
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="text-pixio-500" size={24} /></div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const Icon = getIcon(cat.icon);
            const catImages = images.filter((img) => img.category_name === cat.slug);
            return (
              <div key={cat.id} className="card p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-pixio-50 text-pixio-600 flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  <p className="font-medium text-ink-800 text-sm flex-1">
                    {getCategoryName(cat, isEs ? 'es' : 'en')}
                  </p>
                  <span className="text-[10px] text-ink-400">{catImages.length}/4</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {catImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-ink-200 group">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleDelete(img)}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <Trash2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  ))}
                  {catImages.length < 4 && (
                    <button type="button" onClick={() => triggerUpload(cat.id)}
                      disabled={uploading === cat.id}
                      className="aspect-square rounded-lg border-2 border-dashed border-ink-200 hover:border-pixio-400 flex items-center justify-center text-ink-400 hover:text-pixio-500 transition-colors">
                      {uploading === cat.id ? <Spinner size={16} /> : <ImagePlus size={20} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =================== ALERTS TAB =================== */
function AlertsTab({ isEs }: { isEs: boolean }) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts((data || []) as AdminAlert[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await supabase.from('admin_alerts').update({ is_read: true }).eq('id', id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const markAllRead = async () => {
    const unreadIds = alerts.filter((a) => !a.is_read).map((a) => a.id);
    if (unreadIds.length === 0) return;
    await supabase.from('admin_alerts').update({ is_read: true }).in('id', unreadIds);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const alertIcon = (type: string) => {
    switch (type) {
      case 'payment_release': return <DollarSign size={16} className="text-green-600" />;
      case 'change_order': return <FileText size={16} className="text-pixio-600" />;
      case 'dispute': return <AlertTriangle size={16} className="text-danger-500" />;
      case 'verification': return <ShieldCheck size={16} className="text-blue-500" />;
      default: return <Bell size={16} className="text-ink-500" />;
    }
  };

  const alertColor = (type: string) => {
    switch (type) {
      case 'payment_release': return 'bg-green-50 border-green-200';
      case 'change_order': return 'bg-pixio-50 border-pixio-200';
      case 'dispute': return 'bg-danger-50 border-danger-200';
      case 'verification': return 'bg-blue-50 border-blue-200';
      default: return 'bg-ink-50 border-ink-200';
    }
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, { es: string; en: string }> = {
      payment_release: { es: 'Pago', en: 'Payment' },
      change_order: { es: 'Trabajo Extra', en: 'Change Order' },
      dispute: { es: 'Disputa', en: 'Dispute' },
      verification: { es: 'Verificacion', en: 'Verification' },
    };
    return isEs ? (labels[type]?.es || type) : (labels[type]?.en || type);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isEs ? 'ahora' : 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-ink-800 flex items-center gap-2">
          <Bell size={18} className="text-pixio-600" />
          {isEs ? 'Centro de Alertas' : 'Alert Center'}
          {unreadCount > 0 && (
            <span className="text-xs bg-danger-100 text-danger-700 px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs text-pixio-600 font-medium hover:underline">
            {isEs ? 'Marcar todo leido' : 'Mark all read'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner className="text-pixio-500" size={24} /></div>
      ) : alerts.length === 0 ? (
        <div className="card p-6 text-center">
          <Bell size={32} className="text-ink-300 mx-auto mb-2" />
          <p className="text-sm text-ink-500">{isEs ? 'Sin alertas por el momento' : 'No alerts yet'}</p>
          <p className="text-xs text-ink-400 mt-1">
            {isEs ? 'Las notificaciones de pagos, disputas y trabajos extra apareceran aqui' : 'Payment, dispute, and change order notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => !alert.is_read && markRead(alert.id)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all ${alertColor(alert.alert_type)} ${
                !alert.is_read ? 'ring-2 ring-pixio-200' : 'opacity-75'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{alertIcon(alert.alert_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                      {typeLabel(alert.alert_type)}
                    </span>
                    <span className="text-[10px] text-ink-400 ml-auto">{timeAgo(alert.created_at)}</span>
                    {!alert.is_read && <span className="w-2 h-2 rounded-full bg-pixio-500 shrink-0" />}
                  </div>
                  <p className="text-sm font-semibold text-ink-800 line-clamp-1">{alert.title}</p>
                  {alert.description && (
                    <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{alert.description}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =================== SHARED =================== */
const colorMap: Record<string, { bg: string; text: string }> = {
  pixio: { bg: 'bg-pixio-50', text: 'text-pixio-600' },
  accent: { bg: 'bg-accent-50', text: 'text-accent-600' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600' },
};

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  const c = colorMap[color] || colorMap.pixio;
  return (
    <div className="card p-4 text-center">
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mx-auto mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-ink-800">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}
