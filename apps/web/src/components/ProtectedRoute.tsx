import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '@badminton-live/shared';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="min-h-screen bg-dark-900 text-slate-100 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl text-center space-y-6 border border-rose-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">403 — Access Denied</h2>
            <p className="text-slate-400 text-sm mt-2">
              Your role <span className="font-semibold text-rose-400">&apos;{user.role}&apos;</span> does not have permission to access this dashboard.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-dark-800/80 text-xs text-slate-400 space-y-1 text-left border border-slate-800">
            <div><strong className="text-slate-300">Required Roles:</strong> {allowedRoles.join(', ')}</div>
            <div><strong className="text-slate-300">Your Account:</strong> {user.email}</div>
          </div>

          <div className="flex gap-3 justify-center">
            {user.role === 'SCORER' ? (
              <a
                href="/scorer"
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition"
              >
                Go to Scorer Dashboard
              </a>
            ) : (
              <a
                href="/admin"
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition"
              >
                Go to Admin Dashboard
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
