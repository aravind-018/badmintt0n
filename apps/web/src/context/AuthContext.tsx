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
    const token = localStorage.getItem('badminton_access_token');
    if (token) {
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Session expired');
          return res.json();
        })
        .then((data) => {
          setUser(data.user);
          setAccessToken(token);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('badminton_access_token');
          localStorage.removeItem('badminton_refresh_token');
          setUser(null);
          setAccessToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
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
    } catch (err) {
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
