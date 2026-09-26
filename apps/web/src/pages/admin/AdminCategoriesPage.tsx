import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Layers, Plus, Search, Trash2, X, AlertTriangle } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTournament, setSelectedTournament] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllInput, setDeleteAllInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [type, setType] = useState('MENS_SINGLES');
  const [formTournamentId, setFormTournamentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleDeleteAllCategories = async () => {
    if (deleteAllInput !== 'DELETE') return;
    setIsDeletingAll(true);
    try {
      let url = '/api/v1/categories/all';
      if (selectedTournament) url += `?tournamentId=${selectedTournament}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete all categories', 'error');
      } else {
        showToast('All categories deleted successfully');
        setIsDeleteAllModalOpen(false);
        setDeleteAllInput('');
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting categories', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, tournRes] = await Promise.all([
        fetch(`/api/v1/categories${selectedTournament ? `?tournamentId=${selectedTournament}` : ''}`),
        fetch('/api/v1/tournaments'),
      ]);

      const catData = await catRes.json();
      const tournData = await tournRes.json();

      setCategories(catData.categories || []);
      setTournaments(tournData.tournaments || []);

      if (tournData.tournaments?.length > 0 && !formTournamentId) {
        setFormTournamentId(tournData.tournaments[0].id);
      }
    } catch (err) {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTournament]);

  const openCreateModal = () => {
    setType('MENS_SINGLES');
    if (tournaments.length > 0) {
      setFormTournamentId(tournaments[0].id);
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTournamentId || !type) {
      setFormError('Tournament and Category Type are required.');
      return;
    }

    try {
      const res = await fetch('/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tournamentId: formTournamentId, type }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to add category');
        return;
      }

      showToast('Category added successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while adding category.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`/api/v1/categories/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        showToast('Failed to delete category', 'error');
      } else {
        showToast('Category deleted successfully');
        fetchData();
      }
    } catch (err) {
      showToast('Network error', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-accent-cyan" /> Tournament Categories
            </h2>
            <p className="text-slate-400 text-xs mt-1">Configure competition events (Singles, Doubles, Team Events)</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.length > 0 && (
              <button
                onClick={() => {
                  setDeleteAllInput('');
                  setIsDeleteAllModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition"
              >
                <Trash2 className="w-4 h-4" /> Delete All Categories
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        </div>

        {/* Tournament Filter */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3 text-xs">
          <span className="text-slate-300 font-semibold">Filter by Tournament:</span>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none focus:border-brand-500 flex-1 max-w-md"
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Layers className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Categories Configured</h3>
            <p className="text-slate-400 text-xs">Add categories to organize singles and doubles events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="glass-card glass-card-hover p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-accent-cyan font-bold uppercase">{c.tournament?.name || 'Tournament'}</div>
                  <h3 className="text-base font-extrabold text-white mt-1">{c.type.replace('_', ' ')}</h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span>{c._count?.matches || 0} Matches</span>
                  <button
                    onClick={() => setDeleteTargetId(c.id)}
                    className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add Category</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Tournament *</label>
                <select
                  value={formTournamentId}
                  onChange={(e) => setFormTournamentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  required
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                >
                  <option value="MENS_SINGLES">MENS_SINGLES</option>
                  <option value="WOMENS_SINGLES">WOMENS_SINGLES</option>
                  <option value="MENS_DOUBLES">MENS_DOUBLES</option>
                  <option value="WOMENS_DOUBLES">WOMENS_DOUBLES</option>
                  <option value="MIXED_DOUBLES">MIXED_DOUBLES</option>
                  <option value="TEAM_EVENT">TEAM_EVENT</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold glow-green"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-white">Delete Category?</h3>
              <p className="text-xs text-slate-400 mt-1">This will remove this category from the tournament.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-xl font-extrabold text-white">Delete All Categories?</h3>
              <p className="text-xs text-rose-300 mt-2">
                WARNING: This will permanently delete <strong>ALL</strong> categories and associated fixtures/standings. This action cannot be undone.
              </p>
            </div>
            <div className="text-left space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Type <span className="font-mono text-rose-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteAllInput}
                onChange={(e) => setDeleteAllInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-rose-500/50 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteAllInput !== 'DELETE' || isDeletingAll}
                onClick={handleDeleteAllCategories}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
              >
                {isDeletingAll ? 'Deleting...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
