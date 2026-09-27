import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserCheck, Plus, Search, Edit, Trash2, X, Award, Shield, AlertTriangle } from 'lucide-react';

export const AdminPlayersPage: React.FC = () => {
  const { accessToken, fetchWithAuth } = useAuth();
  const { showToast } = useToast();

  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllInput, setDeleteAllInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [name, setName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [seed, setSeed] = useState<number | ''>('');
  const [ranking, setRanking] = useState<number | ''>('');
  const [teamId, setTeamId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleDeleteAll = async () => {
    if (deleteAllInput !== 'DELETE') return;
    setIsDeletingAll(true);
    try {
      const res = await fetchWithAuth('/api/v1/players/all', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete all players', 'error');
      } else {
        showToast('All players deleted successfully');
        setIsDeleteAllModalOpen(false);
        setDeleteAllInput('');
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting players', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/players?search=${encodeURIComponent(search)}`;
      if (genderFilter) url += `&gender=${genderFilter}`;

      const [playerRes, teamRes] = await Promise.all([
        fetch(url),
        fetch('/api/v1/teams'),
      ]);

      const playerData = await playerRes.json();
      const teamData = await teamRes.json();

      setPlayers(playerData.players || []);
      setTeams(teamData.teams || []);
    } catch (err) {
      showToast('Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, genderFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setGender('MALE');
    setSeed('');
    setRanking('');
    setTeamId(teams.length > 0 ? teams[0].id : '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setGender(p.gender);
    setSeed(p.seed || '');
    setRanking(p.ranking || '');
    setTeamId(p.teamPlayers?.[0]?.teamId || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !gender) {
      setFormError('Player name and Gender are required.');
      return;
    }

    const payload: any = {
      name,
      gender,
      seed: seed !== '' ? Number(seed) : null,
      ranking: ranking !== '' ? Number(ranking) : null,
      teamId: teamId || undefined,
    };

    const url = editingId ? `/api/v1/players/${editingId}` : '/api/v1/players';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save player');
        return;
      }

      showToast(editingId ? 'Player updated successfully!' : 'Player created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while saving player.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetchWithAuth(`/api/v1/players/${deleteTargetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        showToast('Failed to delete player', 'error');
      } else {
        showToast('Player deleted successfully');
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
              <UserCheck className="w-6 h-6 text-accent-emerald" /> Player Registry
            </h2>
            <p className="text-slate-400 text-xs mt-1">Manage tournament athletes, seeds, rankings, and team memberships</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {players.length > 0 && (
              <button
                onClick={() => {
                  setDeleteAllInput('');
                  setIsDeleteAllModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition"
              >
                <Trash2 className="w-4 h-4" /> Delete All Players
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
            >
              <Plus className="w-4 h-4" /> Add Player
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players by name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-800 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">All Genders</option>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
        </div>

        {/* Player Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading players...</div>
        ) : players.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Players Registered</h3>
            <p className="text-slate-400 text-xs">Add players to assign them to teams and categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {players.map((p) => {
              const teamName = p.teamPlayers?.[0]?.team?.name || 'Unassigned';
              return (
                <div key={p.id} className="glass-card glass-card-hover p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-accent-emerald">{p.gender}</span>
                      {p.seed && (
                        <span className="px-2 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber font-mono font-bold">
                          Seed #{p.seed}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-white">{p.name}</h3>
                    <div className="text-xs text-slate-400 font-medium">{teamName}</div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>Rank: {p.ranking ? `#${p.ranking}` : 'Unranked'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(p.id)}
                        className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Player' : 'Add Player'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Player Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Viktor Axelsen"
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign to Team</label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                >
                  <option value="">No Team (Independent)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tournament Seed</label>
                  <input
                    type="number"
                    min="1"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">World Ranking</label>
                  <input
                    type="number"
                    min="1"
                    value={ranking}
                    onChange={(e) => setRanking(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
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
                  {editingId ? 'Save Changes' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-white">Delete Player?</h3>
              <p className="text-xs text-slate-400 mt-1">This will remove the player record.</p>
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
              <h3 className="text-xl font-extrabold text-white">Delete All Players?</h3>
              <p className="text-xs text-rose-300 mt-2">
                WARNING: This will permanently delete <strong>ALL</strong> registered players and their team assignments. This action cannot be undone.
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
                onClick={handleDeleteAll}
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
