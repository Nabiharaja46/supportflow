import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, clearStoredSession, getStoredSession, storeSession, type SessionUser } from '../api/client';

interface AuthContextValue {
  token: string | null;
  user: SessionUser | null;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialSession = getStoredSession();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null);
  const [user, setUser] = useState<SessionUser | null>(initialSession?.user ?? null);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; user: SessionUser }>('POST', '/auth/login', {
      body: { email, password },
      auth: false, // wrong-credential 401s must NOT trigger a sign-out redirect
    });
    storeSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}