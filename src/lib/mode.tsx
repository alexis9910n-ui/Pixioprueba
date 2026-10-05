import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppMode } from './types';
import { useAuth } from './auth';

interface ModeContextValue {
  mode: AppMode;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<AppMode>('client');

  const role = profile?.role;
  useEffect(() => {
    if (role === 'contractor') {
      setMode('contractor');
    } else {
      setMode('client');
    }
  }, [role]);

  const value = useMemo(() => ({ mode }), [mode]);

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
