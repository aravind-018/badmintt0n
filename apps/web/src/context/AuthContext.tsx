import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role } from '@badminton-live/shared';

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
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
}

let activeRefreshPromise: Promise<string | null> | null = null;

export async function requestTokenRefresh(): Promise<string | null> {
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem('badminton_refresh_token');
      if (!refreshToken) return null;

      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        localStorage.removeItem('badminton_access_token');
        localStorage.removeItem('badminton_refresh_token');
        return null;
      }

      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('badminton_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('badminton_refresh_token', data.refreshToken);
        }
        return data.accessToken as string;
      }
      return null;
    } catch (err) {
      console.warn('[AuthContext] Refresh request failed:', err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export async function fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('badminton_access_token');
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, { ...init, headers });

  // If 401 Unauthorized, attempt refresh
  if (res.status === 401) {
    const newToken = await requestTokenRefresh();
    if (newToken) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

  return res;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('badminton_access_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore user session on mount if token exists
  useEffect(() => {
    let isCancelled = false;

    async function restoreSession() {
      const token = localStorage.getItem('badminton_access_token');
      const refreshToken = localStorage.getItem('badminton_refresh_token');

      if (!token && !refreshToken) {
        if (!isCancelled) setIsLoading(false);
        return;
      }

      // Try with current access token
      if (token) {
        try {
          const res = await fetch('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            const data = await res.json();
            if (!isCancelled) {
              setUser(data.user);
              setAccessToken(token);
              setIsLoading(false);
            }
            return;
          }
        } catch {
          // fetch network issue or 401, proceed to refresh token
        }
      }

      // If token missing or invalid/expired (401), try refresh token
      if (refreshToken) {
        const refreshedToken = await requestTokenRefresh();
        if (refreshedToken) {
          try {
            const res = await fetch('/api/v1/auth/me', {
              headers: { Authorization: `Bearer ${refreshedToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (!isCancelled) {
                setUser(data.user);
                setAccessToken(refreshedToken);
                setIsLoading(false);
              }
              return;
            }
          } catch {
            // refresh failed to fetch me
          }
        }
      }

      // If neither worked, clean up invalid tokens
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
