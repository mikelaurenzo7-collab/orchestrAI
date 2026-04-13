import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
  plan?: string;
  trial_ends_at?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => Promise<void>;
  token: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, login: async () => null, register: async () => null, logout: async () => {}, token: null,
});

export function useAuth() { return useContext(AuthContext); }

function formatError(detail: any): string {
  if (!detail) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e?.msg || JSON.stringify(e)).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      if (savedToken) {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${savedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setToken(savedToken);
        } else {
          await AsyncStorage.removeItem('auth_token');
          setUser(null);
          setToken(null);
        }
      }
    } catch (e) {
      console.error('Auth check error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return formatError(data.detail);
      await AsyncStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return null;
    } catch (e) {
      return 'Connection error. Please try again.';
    }
  };

  const register = async (email: string, password: string, name: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return formatError(data.detail);
      await AsyncStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return null;
    } catch (e) {
      return 'Connection error. Please try again.';
    }
  };

  const logout = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('auth_token');
      if (savedToken) {
        await fetch(`${API}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${savedToken}` },
        });
      }
    } catch (e) { /* ignore */ }
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}
