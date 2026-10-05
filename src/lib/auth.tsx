import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isNewSignup: boolean;
  clearNewSignup: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string, role: Profile['role'], extra?: { companyName: string; licenseNumber: string; businessPhone: string; trades?: string[] }) => Promise<{ error: string | null }>;
  sendPhoneOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data as Profile | null;
  } catch {
    return null;
  }
}

async function ensureProfile(session: Session): Promise<Profile | null> {
  const userId = session.user.id;
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const email = session.user.email || '';
  const meta = session.user.user_metadata || {};
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: meta.full_name || email.split('@')[0] || 'User',
    phone: meta.phone || null,
    phone_number: meta.phone_number || meta.phone || null,
    role: meta.role || 'client',
  }, { onConflict: 'id' });

  if (error && !error.message.includes('duplicate')) {
    return null;
  }
  return fetchProfile(userId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const profileCreatedFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.session) {
        // Purge stale tokens if session recovery fails
        if (error) supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setSession(data.session);
      ensureProfile(data.session).then((p) => {
        if (mounted && p) setProfile(p);
        if (mounted) setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED') return;
      (async () => {
        const p = await ensureProfile(newSession);
        if (mounted && p) setProfile(p);
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login')) return { error: 'auth.errorInvalid' };
        return { error: error.message };
      }
      return { error: null };
    } catch {
      return { error: 'auth.errorNetwork' };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: Profile['role'],
    extra?: { companyName: string; licenseNumber: string; businessPhone: string; trades?: string[] },
  ): Promise<{ error: string | null }> => {
    try {
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, phone_number: phone, role },
        },
      });

      const userAlreadyExists =
        (error && (error.message.includes('already') || error.message.includes('already registered')))
        || (data?.user && (!data.user.identities || data.user.identities.length === 0));

      if (userAlreadyExists) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          return { error: 'auth.errorExistsTryLogin' };
        }
        if (signInData.user) {
          const upsertFields: Record<string, unknown> = {
            id: signInData.user.id,
            email,
            full_name: fullName,
            phone: phone || null,
            role,
          };
          if (extra) {
            upsertFields.company_name = extra.companyName;
            upsertFields.license_number = extra.licenseNumber;
            upsertFields.business_phone = extra.businessPhone;
            upsertFields.trades = extra.trades ?? [];
          }
          await supabase.from('profiles').upsert(upsertFields, { onConflict: 'id' });
          const p = await fetchProfile(signInData.user.id);
          if (p) setProfile(p);
        }
        return { error: null };
      }

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        profileCreatedFor.current = data.user.id;
        const { error: insertError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          verification_status: 'pending',
          ...(extra ? {
            company_name: extra.companyName,
            license_number: extra.licenseNumber,
            business_phone: extra.businessPhone,
            trades: extra.trades ?? [],
          } : {}),
        }, { onConflict: 'id' });
        if (insertError && !insertError.message.includes('duplicate')) {
          return { error: insertError.message };
        }
        const p = await fetchProfile(data.user.id);
        if (p) setProfile(p);
        setIsNewSignup(true);
      }
      return { error: null };
    } catch {
      return { error: 'auth.errorNetwork' };
    }
  };

  const sendPhoneOtp = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: 'auth.errorOtpSend' };
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) return { error: error.message };
      return { error: null };
    } catch {
      return { error: 'auth.errorOtpInvalid' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsNewSignup(false);
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    const p = await fetchProfile(session.user.id);
    if (p) setProfile(p);
  };

  const clearNewSignup = () => setIsNewSignup(false);

  return (
    <AuthContext.Provider value={{
      session, profile, loading, isNewSignup, clearNewSignup,
      signIn, signUp, sendPhoneOtp, verifyPhoneOtp,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
