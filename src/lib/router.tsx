import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Route = {
  page: string;
  params?: Record<string, string>;
};

interface RouterContextValue {
  route: Route;
  navigate: (page: string, params?: Record<string, string>) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Route[]>([{ page: 'home' }]);

  const navigate = useCallback((page: string, params?: Record<string, string>) => {
    setHistory((prev) => [...prev, { page, params }]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const route = history[history.length - 1];

  return (
    <RouterContext.Provider value={{ route, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

// Convenience hook with shorter names
export function useNavigate() {
  const { navigate, goBack } = useRouter();
  return { navigate, goBack };
}
