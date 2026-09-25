import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';

interface Announcement {
  id: string;
  tournamentId: string;
  title: string;
  body: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  tournament?: { id: string; name: string };
  createdBy?: { id: string; name: string };
}

export const AdminAnnouncementsPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTournamentId, setFormTournamentId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [isPublishImmediately, setIsPublishImmediately] = useState(true);

  const fetchAnnouncements = () => {
    setLoading(true);
    fetch('/api/v1/announcements')
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
    fetch('/api/v1/tournaments')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.tournaments || [];
        setTournaments(list);
        if (list.length > 0) setFormTournamentId(list[0].id);
      })
      .catch((err) => console.error(err));
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormBody('');
    setIsPublishImmediately(true);
    if (tournaments.length > 0) setFormTournamentId(tournaments[0].id);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingId(item.id);
    setFormTournamentId(item.tournamentId);
    setFormTitle(item.title);
    setFormBody(item.body);
    setIsPublishImmediately(!!item.publishedAt);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formBody) {
      showToast('Title and body are required', 'error');
      return;
    }

    const payload = {
      tournamentId: formTournamentId,
      title: formTitle,
      body: formBody,
      publishedAt: isPublishImmediately ? new Date().toISOString() : null,
    };

    try {
      const url = editingId ? `/api/v1/announcements/${editingId}` : '/api/v1/announcements';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save announcement');

      showToast(editingId ? 'Announcement updated' : 'Announcement created', 'success');
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const togglePublish = async (item: Announcement) => {
    const isPublished = !!item.publishedAt;
    const action = isPublished ? 'unpublish' : 'publish';
    try {
      const res = await fetch(`/api/v1/announcements/${item.id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Failed to ${action} announcement`);
      showToast(`Announcement ${isPublished ? 'unpublished' : 'published'}`, 'success');
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/v1/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete announcement');
      showToast('Announcement deleted', 'success');
      fetchAnnouncements();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-slate-400 hover:text-white transition text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              📢 Announcements Management
            </h1>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
          >
            + Create Announcement
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📢</div>
            <h3 className="text-lg font-bold text-white mb-1">No Announcements Yet</h3>
            <p className="text-slate-400 text-sm mb-4">Post tournament updates, schedule changes, or broadcast notices.</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition"
            >
              + Create First Announcement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {announcements.map((item) => (
              <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                      {item.tournament?.name || 'Tournament'}
                    </span>
                    <button
                      onClick={() => togglePublish(item)}
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition ${
                        item.publishedAt
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      {item.publishedAt ? '● Published' : '○ Draft (Unpublished)'}
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.body}</p>
                </div>

                <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>Posted {new Date(item.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition font-medium border border-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-6">
            <h2 className="text-xl font-bold text-white">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Tournament</label>
                <select
                  value={formTournamentId}
                  onChange={(e) => setFormTournamentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Schedule Change for Court 2"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Announcement Body</label>
                <textarea
                  rows={4}
                  placeholder="Details of the announcement..."
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishImmediately"
                  checked={isPublishImmediately}
                  onChange={(e) => setIsPublishImmediately(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="publishImmediately" className="text-xs text-slate-300 cursor-pointer">
                  Publish immediately (visible to public website)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  {editingId ? 'Save Changes' : 'Create & Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
