import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Plus, Search, Filter, Edit, Trash2, Zap, Clock, MapPin, X, AlertTriangle, Radio } from 'lucide-react';

export const AdminFixturesPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllInput, setDeleteAllInput] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const [isDeleteBracketModalOpen, setIsDeleteBracketModalOpen] = useState(false);
  const [deleteBracketInput, setDeleteBracketInput] = useState('');
  const [isDeletingBracket, setIsDeletingBracket] = useState(false);

  const handleDeleteAllFixtures = async () => {
    if (deleteAllInput !== 'DELETE') return;
    setIsDeletingAll(true);
    try {
      let url = '/api/v1/matches/all';
      if (tournamentId) url += `?tournamentId=${tournamentId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete all fixtures', 'error');
      } else {
        showToast('All fixtures deleted successfully');
        setIsDeleteAllModalOpen(false);
        setDeleteAllInput('');
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting fixtures', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteAllBrackets = async () => {
    if (deleteBracketInput !== 'DELETE') return;
    setIsDeletingBracket(true);
    try {
      let url = '/api/v1/matches/brackets/all';
      if (tournamentId) url += `?tournamentId=${tournamentId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete bracket matches', 'error');
      } else {
        showToast('Bracket matches deleted successfully');
        setIsDeleteBracketModalOpen(false);
        setDeleteBracketInput('');
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting bracket matches', 'error');
    } finally {
      setIsDeletingBracket(false);
    }
  };

  // Form states
  const [tournamentId, setTournamentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [round, setRound] = useState('Quarter Final');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sideAName, setSideAName] = useState('');
  const [sideBName, setSideBName] = useState('');
  const [status, setStatus] = useState('SCHEDULED');
  const [winnerId, setWinnerId] = useState('');
  const [targetPoints, setTargetPoints] = useState<number>(21);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick participant picker state
  const [sideAPlayer1, setSideAPlayer1] = useState('');
  const [sideAPlayer2, setSideAPlayer2] = useState('');
  const [sideBPlayer1, setSideBPlayer1] = useState('');
  const [sideBPlayer2, setSideBPlayer2] = useState('');

  // Generator states
  const [generatorType, setGeneratorType] = useState<'KNOCKOUT' | 'ROUND_ROBIN'>('KNOCKOUT');

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const isDoublesCategory = selectedCategoryObj?.type?.includes('DOUBLES');

  const [sideATeamId, setSideATeamId] = useState('');
  const [sideBTeamId, setSideBTeamId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = `/api/v1/matches?search=${encodeURIComponent(search)}`;
      if (categoryFilter) query += `&categoryId=${categoryFilter}`;
      if (courtFilter) query += `&courtId=${courtFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (roundFilter) query += `&round=${encodeURIComponent(roundFilter)}`;

      const [matchRes, tournRes, catRes, courtRes, teamRes, playerRes] = await Promise.all([
        fetch(query),
        fetch('/api/v1/tournaments'),
        fetch('/api/v1/categories'),
        fetch('/api/v1/courts'),
        fetch('/api/v1/teams'),
        fetch('/api/v1/players'),
      ]);

      const mData = await matchRes.json();
      const tData = await tournRes.json();
      const cData = await catRes.json();
      const crtData = await courtRes.json();
      const tmData = await teamRes.json();
      const plData = await playerRes.json();

      setMatches(mData.matches || []);
      setTournaments(tData.tournaments || []);
      setCategories(cData.categories || []);
      setCourts(crtData.courts || []);
      setTeams(tmData.teams || []);
      setPlayers(plData.players || []);

      if (tData.tournaments?.length > 0 && !tournamentId) {
        setTournamentId(tData.tournaments[0].id);
      }
      if (cData.categories?.length > 0 && !categoryId) {
        setCategoryId(cData.categories[0].id);
      }
    } catch (err) {
      showToast('Failed to load matches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeamForSide = (side: 'A' | 'B', selectedTeamId: string) => {
    if (!selectedTeamId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    if (side === 'A') {
      setSideATeamId(selectedTeamId);
      if (selectedTeamId === sideBTeamId) {
        setFormError('A team cannot play against itself.');
      } else {
        setFormError(null);
      }
    } else {
      setSideBTeamId(selectedTeamId);
      if (selectedTeamId === sideATeamId) {
        setFormError('A team cannot play against itself.');
      } else {
        setFormError(null);
      }
    }

    if (isDoublesCategory) {
      if (team.teamPlayers && team.teamPlayers.length >= 2) {
        const pairNames = team.teamPlayers.map((tp: any) => tp.player.name).slice(0, 2).join(' / ');
        const fullName = `${pairNames} (${team.name})`;
        if (side === 'A') setSideAName(fullName);
        else setSideBName(fullName);
      } else if (team.teamPlayers && team.teamPlayers.length === 1) {
        const fullName = `${team.teamPlayers[0].player.name} (${team.name})`;
        if (side === 'A') setSideAName(fullName);
        else setSideBName(fullName);
      } else {
        if (side === 'A') setSideAName(team.name);
        else setSideBName(team.name);
      }
    } else {
      if (side === 'A') setSideAName(team.name);
      else setSideBName(team.name);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter, courtFilter, statusFilter, roundFilter]);

  const openCreateModal = () => {
    setEditingMatch(null);
    setRound('Quarter Final');
    setCourtId(courts[0]?.id || '');
    setScheduledAt('2026-10-18T10:00');
    setSideAName('');
    setSideBName('');
    setSideATeamId('');
    setSideBTeamId('');
    setStatus('SCHEDULED');
    setWinnerId('');
    setTargetPoints(21);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (m: any) => {
    setEditingMatch(m);
    setTournamentId(m.tournamentId);
    setCategoryId(m.categoryId);
    setCourtId(m.courtId || '');
    setRound(m.round || 'Round 1');
    setScheduledAt(m.scheduledAt ? new Date(m.scheduledAt).toISOString().slice(0, 16) : '');
    setSideAName(m.sideAName);
    setSideBName(m.sideBName);
    setSideATeamId(m.sideAId || '');
    setSideBTeamId(m.sideBId || '');
    setStatus(m.status);
    setWinnerId(m.winnerId || '');
    setTargetPoints(m.currentGameState?.targetPoints || 21);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!tournamentId || !categoryId || !sideAName || !sideBName) {
      setFormError('Tournament, Category, and Participant names are required.');
      return;
    }

    if (
      sideAName.trim().toLowerCase() === sideBName.trim().toLowerCase() ||
      (sideATeamId && sideATeamId === sideBTeamId)
    ) {
      setFormError('A team cannot play against itself.');
      return;
    }

    const payload = {
      tournamentId,
      categoryId,
      courtId: courtId || null,
      round,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      sideAName,
      sideAId: sideATeamId || editingMatch?.sideAId || 'p-' + Date.now() + '-a',
      sideBName,
      sideBId: sideBTeamId || editingMatch?.sideBId || 'p-' + Date.now() + '-b',
      status,
      winnerId: winnerId || null,
      targetPoints: Number(targetPoints),
    };

    const url = editingMatch ? `/api/v1/matches/${editingMatch.id}` : '/api/v1/matches';
    const method = editingMatch ? 'PUT' : 'POST';

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
        setFormError(data.error || 'Failed to save fixture');
        return;
      }

      showToast(editingMatch ? 'Fixture updated successfully!' : 'Fixture created successfully!');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while saving fixture.');
    }
  };

  const handleGenerateFixtures = async () => {
    if (!tournamentId || !categoryId) {
      showToast('Please select a Tournament and Category', 'error');
      return;
    }

    const endpoint =
      generatorType === 'KNOCKOUT'
        ? '/api/v1/matches/generate-knockout'
        : '/api/v1/matches/generate-round-robin';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tournamentId,
          categoryId,
          courtIds: courts.map((c) => c.id),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Generator failed', 'error');
      } else {
        showToast(data.message || 'Fixtures generated!');
        setIsGeneratorModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('Network error generating fixtures', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await fetch(`/api/v1/matches/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        showToast('Failed to delete fixture', 'error');
      } else {
        showToast('Fixture deleted');
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
              <Calendar className="w-6 h-6 text-brand-500" /> Fixture & Bracket Management
            </h2>
            <p className="text-slate-400 text-xs mt-1">Schedule matches, assign courts, and auto-generate tournament brackets</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {matches.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setDeleteAllInput('');
                    setIsDeleteAllModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete All Fixtures
                </button>
                <button
                  onClick={() => {
                    setDeleteBracketInput('');
                    setIsDeleteBracketModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs transition"
                >
                  <Trash2 className="w-4 h-4" /> Clear Bracket
                </button>
              </>
            )}
            <button
              onClick={() => setIsGeneratorModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-amber hover:bg-amber-600 text-dark-900 font-bold text-xs transition shadow-lg"
            >
              <Zap className="w-4 h-4" /> Auto Bracket Generator
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
            >
              <Plus className="w-4 h-4" /> Add Fixture
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-card p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or player name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-dark-800 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-dark-800 border border-slate-700/80 text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="LIVE">LIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {/* Fixtures List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading fixtures...</div>
        ) : matches.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Fixtures Scheduled</h3>
            <p className="text-slate-400 text-xs">Use the Auto Bracket Generator or click &apos;Add Fixture&apos;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-brand-500"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-brand-400 uppercase">{m.round || 'Match'}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-accent-cyan font-semibold">{m.category?.type?.replace('_', ' ') || 'Singles'}</span>
                    <span className="text-slate-500">•</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        m.status === 'COMPLETED'
                          ? 'bg-brand-500/20 text-brand-400'
                          : m.status === 'LIVE'
                          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                          : 'bg-dark-800 text-slate-300'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-base font-bold text-white py-1">
                    <span className={m.winnerId === m.sideAId ? 'text-brand-400 font-extrabold' : ''}>
                      {m.sideAName}
                    </span>
                    <span className="text-slate-500 text-xs font-normal">vs</span>
                    <span className={m.winnerId === m.sideBId ? 'text-brand-400 font-extrabold' : ''}>
                      {m.sideBName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-400 w-full md:w-auto justify-between md:justify-end">
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Clock className="w-3.5 h-3.5 text-accent-amber" />
                      <span>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.court?.name || 'Court Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/scorer/match/${m.id}`}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs border border-amber-500/30 transition flex items-center gap-1"
                    >
                      <Radio className="w-3.5 h-3.5" /> Score
                    </Link>
                    <button
                      onClick={() => openEditModal(m)}
                      className="p-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(m.id)}
                      className="p-2 rounded-xl bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Fixture Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingMatch ? 'Edit Fixture' : 'Create Fixture'}</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveMatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-slate-300 font-semibold mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isDoublesCategory && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
                  <span>🏸 <strong>Doubles Category Detected:</strong> Select teams to auto-combine players (e.g. Player 1 / Player 2) or enter pair names manually.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">Side A Name *</label>
                    {teams.length > 0 && (
                      <select
                        onChange={(e) => handleSelectTeamForSide('A', e.target.value)}
                        className="text-[10px] bg-dark-800 border border-slate-700 text-brand-400 rounded px-1.5 py-0.5 focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Pick Team...</option>
                        {teams.map((t) => {
                          const isDisabled = t.id === sideBTeamId || t.name.trim().toLowerCase() === sideBName.trim().toLowerCase();
                          return (
                            <option key={t.id} value={t.id} disabled={isDisabled}>
                              {t.name} ({t.teamPlayers?.length || 0} players){isDisabled ? ' (Selected)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sideAName}
                    onChange={(e) => {
                      setSideAName(e.target.value);
                      if (e.target.value && e.target.value.trim().toLowerCase() === sideBName.trim().toLowerCase()) {
                        setFormError('A team cannot play against itself.');
                      } else {
                        setFormError(null);
                      }
                    }}
                    placeholder={isDoublesCategory ? "Player 1 / Player 2" : "Viktor Axelsen"}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">Side B Name *</label>
                    {teams.length > 0 && (
                      <select
                        onChange={(e) => handleSelectTeamForSide('B', e.target.value)}
                        className="text-[10px] bg-dark-800 border border-slate-700 text-brand-400 rounded px-1.5 py-0.5 focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Pick Team...</option>
                        {teams.map((t) => {
                          const isDisabled = t.id === sideATeamId || t.name.trim().toLowerCase() === sideAName.trim().toLowerCase();
                          return (
                            <option key={t.id} value={t.id} disabled={isDisabled}>
                              {t.name} ({t.teamPlayers?.length || 0} players){isDisabled ? ' (Selected)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sideBName}
                    onChange={(e) => {
                      setSideBName(e.target.value);
                      if (e.target.value && e.target.value.trim().toLowerCase() === sideAName.trim().toLowerCase()) {
                        setFormError('A team cannot play against itself.');
                      } else {
                        setFormError(null);
                      }
                    }}
                    placeholder={isDoublesCategory ? "Player 3 / Player 4" : "Shi Yuqi"}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Round</label>
                  <input
                    type="text"
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    placeholder="Quarter Final / Semi Final / Final"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assign Court</label>
                  <select
                    value={courtId}
                    onChange={(e) => setCourtId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  >
                    <option value="">Unassigned</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Score (Max Points)</label>
                  <select
                    value={targetPoints}
                    onChange={(e) => setTargetPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-amber-400 font-bold"
                  >
                    <option value={21}>21 Points (BWF Standard)</option>
                    <option value={15}>15 Points (Medium Format)</option>
                    <option value={11}>11 Points (Fast Format)</option>
                    <option value={30}>30 Points (Single Game / Extended)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {status === 'COMPLETED' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Select Winner</label>
                  <select
                    value={winnerId}
                    onChange={(e) => setWinnerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white font-bold"
                  >
                    <option value="">No Winner Selected</option>
                    {editingMatch?.sideAId && <option value={editingMatch.sideAId}>Side A: {sideAName}</option>}
                    {editingMatch?.sideBId && <option value={editingMatch.sideBId}>Side B: {sideBName}</option>}
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold glow-green"
                >
                  {editingMatch ? 'Save Changes' : 'Create Fixture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto Bracket Generator Modal */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-amber-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-amber" /> Auto Bracket Generator
              </h3>
              <button onClick={() => setIsGeneratorModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Automatically generates match brackets (Round of 16, Quarter Finals, Semi Finals, Final) and links winner progression!
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tournament</label>
                <select
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Format Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratorType('KNOCKOUT')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      generatorType === 'KNOCKOUT'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-dark-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Knockout Bracket
                  </button>

                  <button
                    type="button"
                    onClick={() => setGeneratorType('ROUND_ROBIN')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      generatorType === 'ROUND_ROBIN'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-dark-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Round Robin
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGeneratorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFixtures}
                  className="px-4 py-2 rounded-xl bg-accent-amber hover:bg-amber-600 text-dark-900 font-bold shadow-lg"
                >
                  Generate Fixtures
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-white">Delete Fixture?</h3>
              <p className="text-xs text-slate-400 mt-1">This action will remove the scheduled match.</p>
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

      {/* Delete All Fixtures Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl text-center space-y-4 border border-rose-500/30">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-xl font-extrabold text-white">Delete All Fixtures?</h3>
              <p className="text-xs text-rose-300 mt-2">
                WARNING: This will permanently delete <strong>ALL</strong> fixtures and recorded scores. This action cannot be undone.
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
                onClick={handleDeleteAllFixtures}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
              >
                {isDeletingAll ? 'Deleting...' : 'Permanently Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Brackets Modal */}
      {isDeleteBracketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl text-center space-y-4 border border-amber-500/30">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <div>
              <h3 className="text-xl font-extrabold text-white">Clear Tournament Bracket?</h3>
              <p className="text-xs text-amber-300 mt-2">
                WARNING: This will clear <strong>ALL</strong> generated bracket matches. This action cannot be undone.
              </p>
            </div>
            <div className="text-left space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Type <span className="font-mono text-amber-400 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteBracketInput}
                onChange={(e) => setDeleteBracketInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-amber-500/50 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteBracketModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBracketInput !== 'DELETE' || isDeletingBracket}
                onClick={handleDeleteAllBrackets}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
              >
                {isDeletingBracket ? 'Clearing...' : 'Clear Bracket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
