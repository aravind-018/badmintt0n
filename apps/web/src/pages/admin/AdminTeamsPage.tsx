import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Users, Plus, Search, Edit, Trash2, X, Building, UserCheck, Loader2 } from 'lucide-react';

export const AdminTeamsPage: React.FC = () => {
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();

  const [teams, setTeams] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingSingle, setDeletingSingle] = useState(false);

  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TOURNAMENT_ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamRes, tournRes] = await Promise.all([
        fetch(`/api/v1/teams?search=${encodeURIComponent(search.trim())}`),
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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!tournamentId) {
      errors.tournamentId = 'Tournament selection is required';
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Team name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Team name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Team name must be 100 characters or less';
    }

    if (organization.trim().length > 100) {
      errors.organization = 'Organization must be 100 characters or less';
    }

    if (contactName.trim().length > 100) {
      errors.contactName = 'Contact name must be 100 characters or less';
    }

    if (contactPhone.trim()) {
      const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
      if (!phoneRegex.test(contactPhone.trim())) {
        errors.contactPhone = 'Please enter a valid phone number';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setOrganization('');
    setContactName('');
    setContactPhone('');
    if (tournaments.length > 0) setTournamentId(tournaments[0].id);
    setFormError(null);
    setFieldErrors({});
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
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    setSaving(true);

    const payload = {
      name: name.trim(),
      tournamentId,
      organization: organization.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
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
        setFormError(data.error || (data.details ? data.details.join(', ') : 'Failed to save team'));
        return;
      }

      showToast(editingId ? 'Team updated successfully!' : 'Team created successfully!');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while saving team.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!deleteTargetId || deletingSingle) return;

    setDeletingSingle(true);
    try {
      const res = await fetch(`/api/v1/teams/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete team', 'error');
      } else {
        showToast('Team deleted successfully');
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting team', 'error');
    } finally {
      setDeletingSingle(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteAllTeams = async () => {
    if (deletingAll) return;

    setDeletingAll(true);
    try {
      const res = await fetch('/api/v1/teams/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete all teams', 'error');
      } else {
        showToast(data.message || 'All teams deleted successfully');
        setIsDeleteAllModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting all teams', 'error');
    } finally {
      setDeletingAll(false);
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

          <div className="flex items-center gap-3">
            {isAdmin && teams.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(true)}
                disabled={deletingAll || loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600 hover:border-rose-600 text-rose-400 hover:text-white font-semibold text-xs transition shadow-lg disabled:opacity-50"
              >
                {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete All Teams
              </button>
            )}

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
            >
              <Plus className="w-4 h-4" /> Create Team
            </button>
          </div>
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
          <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Loading teams...
          </div>
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
                      type="button"
                      onClick={() => openEditModal(team)}
                      className="p-1.5 rounded-lg bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
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
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs" noValidate>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tournament *</label>
                <select
                  value={tournamentId}
                  onChange={(e) => {
                    setTournamentId(e.target.value);
                    if (fieldErrors.tournamentId) setFieldErrors({ ...fieldErrors, tournamentId: '' });
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-dark-800 border text-white ${
                    fieldErrors.tournamentId ? 'border-rose-500' : 'border-slate-700'
                  }`}
                  required
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.tournamentId && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.tournamentId}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Team Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  onBlur={() => validateForm()}
                  placeholder="e.g. Apex Shuttle Club"
                  className={`w-full px-3 py-2 rounded-xl bg-dark-800 border text-white ${
                    fieldErrors.name ? 'border-rose-500' : 'border-slate-700'
                  }`}
                  required
                />
                {fieldErrors.name && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Organization / Club</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value);
                    if (fieldErrors.organization) setFieldErrors({ ...fieldErrors, organization: '' });
                  }}
                  placeholder="e.g. Apex Sports Academy"
                  className={`w-full px-3 py-2 rounded-xl bg-dark-800 border text-white ${
                    fieldErrors.organization ? 'border-rose-500' : 'border-slate-700'
                  }`}
                />
                {fieldErrors.organization && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.organization}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      if (fieldErrors.contactName) setFieldErrors({ ...fieldErrors, contactName: '' });
                    }}
                    placeholder="Coach Name"
                    className={`w-full px-3 py-2 rounded-xl bg-dark-800 border text-white ${
                      fieldErrors.contactName ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  />
                  {fieldErrors.contactName && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.contactName}</p>}
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (fieldErrors.contactPhone) setFieldErrors({ ...fieldErrors, contactPhone: '' });
                    }}
                    placeholder="+1-555-0100"
                    className={`w-full px-3 py-2 rounded-xl bg-dark-800 border text-white ${
                      fieldErrors.contactPhone ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  />
                  {fieldErrors.contactPhone && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.contactPhone}</p>}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold glow-green flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Team Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Team?"
        message="This action will permanently remove this team. This action cannot be undone."
        confirmText="Delete Team"
        isDanger={true}
        isLoading={deletingSingle}
        onConfirm={handleDeleteSingle}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Delete All Teams Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAllModalOpen}
        title="Delete All Teams?"
        message={`This will permanently delete all ${teams.length} team(s) and any dependent team player records. This action cannot be undone.`}
        confirmText="Delete All Teams"
        isDanger={true}
        isLoading={deletingAll}
        onConfirm={handleDeleteAllTeams}
        onCancel={() => setIsDeleteAllModalOpen(false)}
      />
    </AdminLayout>
  );
};
