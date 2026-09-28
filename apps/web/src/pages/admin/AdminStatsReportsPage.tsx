import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface StatsSummary {
  matchesTotal: number;
  matchesCompleted: number;
  matchesLive: number;
  matchesUpcoming: number;
  gamesTotal: number;
  totalPointsScored: number;
  playersCount: number;
  teamsCount: number;
}

interface PlayerStat {
  id: string;
  name: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  pointsScored: number;
}

export const AdminStatsReportsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerStat[]>([]);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'reports'>('stats');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/admin/stats', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
      fetch('/api/v1/admin/reports/summary', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
    ])
      .then(([statsRes, reportRes]) => {
        setStats(statsRes.summary || null);
        setLeaderboard(statsRes.playerLeaderboard || []);
        setReportData(reportRes || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[64px] py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-slate-400 hover:text-white transition text-xs sm:text-sm shrink-0">
              ← Dashboard
            </Link>
            <h1 className="text-base sm:text-xl font-extrabold text-white flex items-center gap-2 truncate">
              📊 Analytics <span className="hidden sm:inline">& Organizer Reports</span>
            </h1>
          </div>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reports
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6 sm:space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Compiling statistics...</p>
          </div>
        ) : activeTab === 'stats' ? (
          <>
            {/* Top Derived Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 sm:p-5 text-center space-y-1">
                <span className="text-xl sm:text-2xl">🏸</span>
                <div className="text-xl sm:text-2xl font-extrabold text-white">{stats?.matchesTotal || 0}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Fixtures Scheduled</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 sm:p-5 text-center space-y-1">
                <span className="text-xl sm:text-2xl">🏆</span>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">{stats?.matchesCompleted || 0}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Completed</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 sm:p-5 text-center space-y-1">
                <span className="text-xl sm:text-2xl">⚡</span>
                <div className="text-xl sm:text-2xl font-extrabold text-amber-400">{stats?.gamesTotal || 0}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Games Played</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 sm:p-5 text-center space-y-1">
                <span className="text-xl sm:text-2xl">🎯</span>
                <div className="text-xl sm:text-2xl font-extrabold text-indigo-400">{stats?.totalPointsScored || 0}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">Points Scored</div>
              </div>
            </div>

            {/* Derived Player Statistics Leaderboard */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🥇 Player Performance Statistics
                </h3>
                <p className="text-xs text-slate-400">
                  Reliably derived strictly from recorded match and game event scores
                </p>
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No match data recorded yet to compile player statistics.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3 text-center">Matches</th>
                        <th className="px-4 py-3 text-center">Wins</th>
                        <th className="px-4 py-3 text-center">Losses</th>
                        <th className="px-4 py-3 text-center">Games (W-L)</th>
                        <th className="px-4 py-3 text-center">Points Scored</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {leaderboard.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 font-bold text-slate-400 text-center">
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                          <td className="px-4 py-3 text-center">{p.matchesPlayed}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-400">{p.wins}</td>
                          <td className="px-4 py-3 text-center text-rose-400">{p.losses}</td>
                          <td className="px-4 py-3 text-center font-mono">
                            {p.gamesWon} - {p.gamesLost}
                          </td>
                          <td className="px-4 py-3 text-center font-extrabold text-amber-400">
                            {p.pointsScored}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Organizer Summary Reports Tab */
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Organizer Executive Report</h3>
                  <p className="text-xs text-slate-400">
                    Comprehensive overview for tournament director and operations staff
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition"
                >
                  🖨️ Print / Export PDF
                </button>
              </div>

              {/* Status Breakdown Grid */}
              {reportData?.statusBreakdown && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                  {Object.entries(reportData.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-center">
                      <div className="text-xs font-semibold text-slate-400">{status}</div>
                      <div className="text-xl font-bold text-white mt-1">{count as number}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Category Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Category Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(reportData?.categories || []).map((cat: any) => (
                    <div key={cat.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-white">{cat.name}</div>
                        <div className="text-xs text-slate-400">{cat.type} • {cat.gender}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-indigo-400">{cat._count?.matches || 0} Matches</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Court Utilization */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Court Utilization Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(reportData?.courts || []).map((court: any) => (
                    <div key={court.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="font-semibold text-white">{court.name}</div>
                      <div className="text-xs text-slate-400 mb-2">{court.location}</div>
                      <div className="text-xs text-emerald-400 font-bold">
                        {court._count?.matches || 0} Matches Assigned
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
