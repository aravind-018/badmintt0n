import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Shield, Users, LogOut, Activity, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, logout, accessToken } = useAuth();
  const [apiResponse, setApiResponse] = useState<any | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const testApi = async (endpoint: string) => {
    setApiResponse(null);
    setApiError(null);

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setApiError(`HTTP ${res.status}: ${data.error || 'Request failed'}`);
      } else {
        setApiResponse(data);
      }
    } catch (err: any) {
      setApiError(`Network failure: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-dark-800/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-emerald flex items-center justify-center glow-green">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                Admin Console <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-500 border border-brand-500/30 font-semibold">{user?.role}</span>
              </h1>
              <p className="text-xs text-slate-400">Tournament Operations & Security Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{user?.name}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <section className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-brand-500">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">System Administrator Control Center</h2>
            <p className="text-slate-400 text-sm">
              Role-based authorization verified. Full privileges active for tournament creation, court scheduling, and user access management.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Authenticated Session
            </div>
          </div>
        </section>

        {/* Management Module Quick Links */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white">Management Modules</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <Link to="/admin/tournaments" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">🏆</span>
              <span className="text-xs font-bold text-white">Tournaments</span>
            </Link>
            <Link to="/admin/categories" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">🎯</span>
              <span className="text-xs font-bold text-white">Categories</span>
            </Link>
            <Link to="/admin/teams" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">🛡️</span>
              <span className="text-xs font-bold text-white">Teams</span>
            </Link>
            <Link to="/admin/players" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">👤</span>
              <span className="text-xs font-bold text-white">Players</span>
            </Link>
            <Link to="/admin/courts" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">🏟️</span>
              <span className="text-xs font-bold text-white">Courts</span>
            </Link>
            <Link to="/admin/fixtures" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">📅</span>
              <span className="text-xs font-bold text-white">Fixtures</span>
            </Link>
            <Link to="/admin/announcements" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">📢</span>
              <span className="text-xs font-bold text-white">Announcements</span>
            </Link>
            <Link to="/admin/audit-logs" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group">
              <span className="text-2xl group-hover:scale-110 transition">📋</span>
              <span className="text-xs font-bold text-white">Audit Logs</span>
            </Link>
            <Link to="/admin/stats" className="glass-card glass-card-hover p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2 group col-span-2 sm:col-span-1">
              <span className="text-2xl group-hover:scale-110 transition">📊</span>
              <span className="text-xs font-bold text-white">Stats & Reports</span>
            </Link>
          </div>
        </section>

        {/* Phase 2 API Verification Panel */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Key className="w-5 h-5 text-brand-500" />
            Backend Authorization API Test Suite
          </div>
          <p className="text-xs text-slate-400">
            Click to test backend JWT role authorization endpoints. Verify that role permissions are strictly enforced by Express middleware.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => testApi('/api/v1/auth/admin-only')}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
            >
              Test GET /api/v1/auth/admin-only
            </button>

            <button
              onClick={() => testApi('/api/v1/auth/scorer-only')}
              className="px-4 py-2.5 rounded-xl bg-dark-700 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold transition"
            >
              Test GET /api/v1/auth/scorer-only
            </button>

            <button
              onClick={() => testApi('/api/v1/auth/me')}
              className="px-4 py-2.5 rounded-xl bg-dark-700 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold transition"
            >
              Test GET /api/v1/auth/me
            </button>
          </div>

          {apiResponse && (
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs font-mono text-brand-400 space-y-1">
              <div className="font-semibold text-brand-300">✅ API Response (200 OK):</div>
              <pre className="overflow-x-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
          )}

          {apiError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400 space-y-1">
              <div className="font-semibold text-rose-300">❌ Authorization Error:</div>
              <div>{apiError}</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
