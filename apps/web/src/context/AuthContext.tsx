import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '@badminton-live/shared';
import { fetchWithAuth, requestTokenRefresh, onTokenRefreshed } from '../lib/api';

export { fetchWithAuth, requestTokenRefresh } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  fetchWithAuth: (url: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('badminton_access_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to background token refreshes to keep React state synchronized
  useEffect(() => {
    const unsubscribe = onTokenRefreshed((newToken) => {
      setAccessToken(newToken);
      if (!newToken) {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  // Restore user session on mount
  useEffect(() => {
    let isCancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem('badminton_access_token');
      const refreshToken = localStorage.getItem('badminton_refresh_token');

      if (!token && !refreshToken) {
        if (!isCancelled) setIsLoading(false);
        return;
      }

      try {
        // fetchWithAuth will automatically refresh if access token expired
        const res = await fetchWithAuth('/api/v1/auth/me');

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setUser(data.user);
            setAccessToken(localStorage.getItem('badminton_access_token'));
            setIsLoading(false);
          }
          return;
        }
      } catch (err) {
        console.warn('[AuthContext] Session restoration error:', err);
      }

      // If auth/me failed completely even after refresh attempt
      if (!isCancelled) {
        localStorage.removeItem('badminton_access_token');
        localStorage.removeItem('badminton_refresh_token');
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      localStorage.setItem('badminton_access_token', data.accessToken);
      localStorage.setItem('badminton_refresh_token', data.refreshToken);
      setAccessToken(data.accessToken);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Network error. Could not connect to API server.' };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('badminton_access_token');
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem('badminton_access_token');
    localStorage.removeItem('badminton_refresh_token');
    setUser(null);
    setAccessToken(null);
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        hasRole,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
