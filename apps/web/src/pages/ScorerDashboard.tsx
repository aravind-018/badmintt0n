import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Radio, Shield, LogOut, Play, CheckCircle2, Lock } from 'lucide-react';

export const ScorerDashboard: React.FC = () => {
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-amber to-orange-500 flex items-center justify-center glow-cyan">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                Scorer Console <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber border border-accent-amber/30 font-semibold">{user?.role}</span>
              </h1>
              <p className="text-xs text-slate-400">Court Live Scoring Terminal</p>
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
        {/* Scorer Status Banner */}
        <section className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-accent-amber">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">Court Match Console</h2>
            <p className="text-slate-400 text-sm">
              Logged in as Court Scorer. Real-time scoring interface ready for point input and live broadcast.
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Scorer Role Authenticated
          </div>
        </section>

        {/* Court Assignment Cards Placeholder */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                COURT 1 — LIVE
              </span>
              <span className="text-xs text-slate-400">Men&apos;s Singles Finals</span>
            </div>
            <div className="flex justify-between items-center py-4 border-y border-slate-800">
              <div className="space-y-1">
                <div className="font-bold text-white text-base">Viktor Axelsen</div>
                <div className="text-xs text-slate-400 font-mono">Set 1: 21 | Set 2: 18</div>
              </div>
              <div className="text-2xl font-black text-brand-500 font-mono">21</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="font-bold text-white text-base">Shi Yuqi</div>
                <div className="text-xs text-slate-400 font-mono">Set 1: 19 | Set 2: 15</div>
              </div>
              <div className="text-2xl font-black text-slate-400 font-mono">15</div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Court Control Interface</h3>
              <p className="text-xs text-slate-400 mt-1">
                Full touch-optimized scoring console with point addition, undo history, and pause/resume logic (Phase 5).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800 border border-slate-700/60 text-xs text-slate-400 space-y-1">
              <div><strong className="text-slate-200">Scorer Account:</strong> {user?.name} ({user?.email})</div>
              <div><strong className="text-slate-200">Assigned Role:</strong> {user?.role}</div>
            </div>
          </div>
        </section>

        {/* Phase 2 Role Boundary Test Panel */}
        <section className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Lock className="w-5 h-5 text-accent-amber" />
            Role Boundary Test Suite (Scorer Perspective)
          </div>
          <p className="text-xs text-slate-400">
            Click below to test backend role restrictions. Notice how accessing <code className="text-amber-400">/admin-only</code> returns <strong>HTTP 403 Forbidden</strong> for a SCORER user, while <code className="text-green-400">/scorer-only</code> succeeds!
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => testApi('/api/v1/auth/scorer-only')}
              className="px-4 py-2.5 rounded-xl bg-accent-amber hover:bg-amber-600 text-dark-900 font-bold text-xs transition"
            >
              Test GET /api/v1/auth/scorer-only (Should Succeed)
            </button>

            <button
              onClick={() => testApi('/api/v1/auth/admin-only')}
              className="px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs transition"
            >
              Test GET /api/v1/auth/admin-only (Should return 403)
            </button>
          </div>

          {apiResponse && (
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs font-mono text-brand-400 space-y-1">
              <div className="font-semibold text-brand-300">✅ Allowed Response (200 OK):</div>
              <pre className="overflow-x-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
          )}

          {apiError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400 space-y-1">
              <div className="font-semibold text-rose-300">🛑 Forbidden Response (403 Expected):</div>
              <div>{apiError}</div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
