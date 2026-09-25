import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface AuditLog {
  id: string;
  userId?: string | null;
  user?: { id: string; name: string; email: string; role: string } | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  LOGOUT: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  POINT_ADDED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  POINT_UNDONE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MATCH_STARTED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  MATCH_PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MATCH_RESUMED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  MATCH_COMPLETED: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  FIXTURE_CHANGED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  ADMIN_ACTION: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export const AdminAuditLogsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '15');

    fetch(`/api/v1/admin/audit-logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, search, page]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-slate-400 hover:text-white transition text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              📋 System Audit Logs
            </h1>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {total} Total Security & Scoring Events Recorded
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <input
            type="text"
            placeholder="Search by user or entity..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-[240px]"
          />

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Action Types</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="POINT_ADDED">POINT_ADDED</option>
            <option value="POINT_UNDONE">POINT_UNDONE</option>
            <option value="MATCH_STARTED">MATCH_STARTED</option>
            <option value="MATCH_PAUSED">MATCH_PAUSED</option>
            <option value="MATCH_RESUMED">MATCH_RESUMED</option>
            <option value="MATCH_COMPLETED">MATCH_COMPLETED</option>
            <option value="FIXTURE_CHANGED">FIXTURE_CHANGED</option>
            <option value="ADMIN_ACTION">ADMIN_ACTION</option>
          </select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white mb-1">No Audit Logs Found</h3>
            <p className="text-slate-400 text-sm">No actions recorded under the current filters.</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Entity</th>
                    <th className="px-6 py-3.5">IP Address</th>
                    <th className="px-6 py-3.5 text-right">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => {
                    const badgeClass = ACTION_COLORS[log.action] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {log.user ? (
                            <div>
                              <div className="font-semibold text-white">{log.user.name}</div>
                              <div className="text-xs text-slate-400">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">System / Anonymous</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {log.entity ? (
                            <span className="text-xs font-mono text-slate-300">
                              {log.entity} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {log.metadata ? (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
                            >
                              View Payload
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {page} of {totalPages} ({total} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Audit Event Metadata Payload</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400 font-mono space-y-1">
              <div>Action: <span className="text-indigo-400 font-bold">{selectedLog.action}</span></div>
              <div>Entity: <span className="text-slate-200">{selectedLog.entity}</span></div>
              <div>Time: <span className="text-slate-200">{new Date(selectedLog.createdAt).toISOString()}</span></div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-xs font-mono text-emerald-400">
              <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
