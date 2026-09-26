import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trophy, Plus, Search, Filter, Edit, Trash2, Calendar, MapPin, Layers, X, AlertTriangle } from 'lucide-react';

export const AdminTournamentsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('2026-10-15');
  const [endDate, setEndDate] = useState('2026-10-20');
  const [status, setStatus] = useState('PUBLISHED');
  const [format, setFormat] = useState('KNOCKOUT');
  const [numberOfCourts, setNumberOfCourts] = useState(4);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTournaments = () => {
    setLoading(true);
    let url = `/api/v1/tournaments?search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setTournaments(data.tournaments || []);
        setLoading(false);
      })
      .catch((err) => {
        showToast('Failed to load tournaments', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTournaments();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setVenue('');
    setStartDate('2026-10-15');
    setEndDate('2026-10-20');
    setStatus('PUBLISHED');
    setFormat('KNOCKOUT');
    setNumberOfCourts(4);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingId(t.id);
    setName(t.name);
    setSlug(t.slug);
    setDescription(t.description || '');
    setVenue(t.venue || '');
    setStartDate(t.startDate ? t.startDate.split('T')[0] : '2026-10-15');
    setEndDate(t.endDate ? t.endDate.split('T')[0] : '2026-10-20');
    setStatus(t.status);
    setFormat(t.format);
    setNumberOfCourts(t.numberOfCourts);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !slug) {
      setFormError('Name and Slug are required.');
      return;
    }

    const payload = {
      name,
      slug,
      description,
      venue,
      startDate,
      endDate,
      status,
      format,
      numberOfCourts: Number(numberOfCourts),
    };

    const url = editingId ? `/api/v1/tournaments/${editingId}` : '/api/v1/tournaments';
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
        setFormError(data.error || 'Failed to save tournament');
        return;
      }

      showToast(editingId ? 'Tournament updated successfully!' : 'Tournament created successfully!');
      setIsModalOpen(false);
      fetchTournaments();
    } catch (err) {
      setFormError('Network error while saving tournament.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`/api/v1/tournaments/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        showToast('Failed to delete tournament', 'error');
      } else {
        showToast('Tournament deleted successfully');
        fetchTournaments();
      }
    } catch (err) {
      showToast('Network error while deleting tournament', 'error');
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
              <Trophy className="w-6 h-6 text-brand-500" /> Tournament Management
            </h2>
            <p className="text-slate-400 text-xs mt-1">Create, configure, and edit tournament events</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
          >
            <Plus className="w-4 h-4" /> Create Tournament
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournaments by name, venue, or slug..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-800 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Tournaments Found</h3>
            <p className="text-slate-400 text-xs">Try adjusting search query or filter, or create a new tournament.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tournaments.map((t) => (
              <div key={t.id} className="glass-card glass-card-hover p-6 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                      {t.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{t.format}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{t.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{t.description || 'No description provided.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                    <span className="truncate">{t.venue || 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent-amber shrink-0" />
                    <span>{t.startDate ? new Date(t.startDate).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-500">
                    {t._count?.categories || 0} Categories • {t.numberOfCourts} Courts
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(t.id)}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
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

      {/* Modal Dialog for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingId ? 'Edit Tournament' : 'Create New Tournament'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
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
                <label className="block text-slate-300 font-semibold mb-1">Tournament Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. National Championship 2026"
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="national-championship-2026"
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Venue</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Sports Arena"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Courts Count</label>
                  <input
                    type="number"
                    min="1"
                    value={numberOfCourts}
                    onChange={(e) => setNumberOfCourts(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  >
                    <option value="KNOCKOUT">KNOCKOUT</option>
                    <option value="ROUND_ROBIN">ROUND_ROBIN</option>
                    <option value="GROUP_KNOCKOUT">GROUP_KNOCKOUT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                />
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
                  {editingId ? 'Save Changes' : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-white">Delete Tournament?</h3>
              <p className="text-xs text-slate-400 mt-1">This action cannot be undone and will delete associated records.</p>
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg"
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
