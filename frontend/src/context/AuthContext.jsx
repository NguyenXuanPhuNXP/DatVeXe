import { useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';

import { AuthContext, isAdminUser } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const { data } = await authService.me();
          if (!cancelled) setUser(data.user);
          return;
        }

        const { data } = await authService.refresh();
        localStorage.setItem('accessToken', data.accessToken);
        if (!cancelled) setUser(data.user);
      } catch {
        localStorage.removeItem('accessToken');
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const applySession = (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      return data.user;
    };

    return {
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: isAdminUser(user),
      login: async (payload) => {
        const { data } = await authService.login(payload);
        return applySession(data);
      },
      register: async (payload) => {
        const { data } = await authService.register(payload);
        return applySession(data);
      },
      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Cookie/session may already be invalid.
        }
        localStorage.removeItem('accessToken');
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
