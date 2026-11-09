import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

interface AuthState {
  admin: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider required');
  return ctx;
}

export function useAuthController(): AuthState {
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<{ admin: boolean }>('/api/auth/me');
      setAdmin(me.admin);
    } catch {
      setAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (password: string) => {
    const res = await api.post<{ token: string }>('/api/auth/login', { password });
    setToken(res.token);
    setAdmin(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setToken(null);
      setAdmin(false);
    }
  }, []);

  return useMemo(
    () => ({ admin, loading, login, logout }),
    [admin, loading, login, logout]
  );
}

export { AuthContext, getToken };
