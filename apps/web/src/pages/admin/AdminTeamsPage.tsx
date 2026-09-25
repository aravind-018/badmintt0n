import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Users, Plus, Search, Edit, Trash2, X, Phone, Building, UserCheck, AlertTriangle } from 'lucide-react';

export const AdminTeamsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [teams, setTeams] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamRes, tournRes] = await Promise.all([
        fetch(`/api/v1/teams?search=${encodeURIComponent(search)}`),
        fetch('/api/v1/tournaments'),
      ]);

      const teamData = await teamRes.json();
      const tournData = await tournRes.json();

      setTeams(teamData.teams || []);
      setTournaments(tournData.tournaments || []);

      if (tournData.tournaments?.length > 0 && !tournamentId) {
        setTournamentId(tournData.tournaments[0].id);
      }
    } catch (err) {
      showToast('Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setOrganization('');
    setContactName('');
    setContactPhone('');
    if (tournaments.length > 0) setTournamentId(tournaments[0].id);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingId(t.id);
    setName(t.name);
    setOrganization(t.organization || '');
    setContactName(t.contactName || '');
    setContactPhone(t.contactPhone || '');
    setTournamentId(t.tournamentId);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !tournamentId) {
      setFormError('Team name and Tournament are required.');
      return;
    }

    const payload = {
      name,
      tournamentId,
      organization,
      contactName,
      contactPhone,
    };

    const url = editingId ? `/api/v1/teams/${editingId}` : '/api/v1/teams';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save team');
        return;
      }

      showToast(editingId ? 'Team updated successfully!' : 'Team created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while saving team.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`/api/v1/teams/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        showToast('Failed to delete team', 'error');
      } else {
        showToast('Team deleted successfully');
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
              <Users className="w-6 h-6 text-brand-500" /> Team Management
            </h2>
            <p className="text-slate-400 text-xs mt-1">Manage participating clubs, organizations, and team contacts</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </div>

        {/* Search Bar */}
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams by name or organization..."
            className="w-full bg-transparent border-none text-white text-xs placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Team List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Teams Registered</h3>
            <p className="text-slate-400 text-xs">Create teams to represent clubs or organizations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="glass-card glass-card-hover p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-brand-400 font-bold uppercase">{team.tournament?.name}</span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-accent-emerald" /> {team.teamPlayers?.length || 0} Players
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{team.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{team.organization || 'Independent Team'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <div>
                    {team.contactName && <span>Contact: {team.contactName} ({team.contactPhone || 'No phone'})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(team.id)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
              <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Team' : 'Create Team'}</h3>
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
                <label className="block text-slate-300 font-semibold mb-1">Tournament *</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
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
                <label className="block text-slate-300 font-semibold mb-1">Team Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Shuttle Club"
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Organization / Club</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Apex Sports Academy"
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Coach Name"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1-555-0100"
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
                  {editingId ? 'Save Changes' : 'Create Team'}
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
              <h3 className="text-lg font-bold text-white">Delete Team?</h3>
              <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
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
    </AdminLayout>
  );
};
