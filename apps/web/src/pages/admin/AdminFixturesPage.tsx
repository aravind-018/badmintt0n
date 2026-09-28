import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { VisualBracketTree, formatBracketParticipant } from '../../components/VisualBracketTree';
import { GroupStageView } from '../../components/GroupStageView';
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Trash2,
  Zap,
  Clock,
  MapPin,
  X,
  Radio,
  Layers,
  List,
  Shield,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Users,
  ChevronRight,
  CheckCircle,
  UserX,
} from 'lucide-react';

export const AdminFixturesPage: React.FC = () => {
  const { accessToken } = useAuth();
  const { showToast } = useToast();

  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Standings state
  const [groupStandings, setGroupStandings] = useState<Record<string, any[]>>({});
  const [groupProgress, setGroupProgress] = useState<any>(null);

  // Navigation / View state
  const [viewMode, setViewMode] = useState<'BRACKET_TREE' | 'LIST_VIEW'>('BRACKET_TREE');
  const [stageTab, setStageTab] = useState<'GROUP_STAGE' | 'KNOCKOUT'>('KNOCKOUT');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [generatorStep, setGeneratorStep] = useState<'CATEGORY' | 'PARTICIPANTS' | 'FORMAT' | 'PREVIEW'>('CATEGORY');
  const [wizardCategoryId, setWizardCategoryId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'ROUND_ROBIN' | 'GROUP_STAGE' | 'KNOCKOUT' | ''>('');
  const [eligibleParticipants, setEligibleParticipants] = useState<any[]>([]);
  const [excludedParticipants, setExcludedParticipants] = useState<any[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [generatorPreview, setGeneratorPreview] = useState<any | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmGenerateChecked, setConfirmGenerateChecked] = useState(false);

  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Form states
  const [tournamentId, setTournamentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [round, setRound] = useState('Quarter Finals');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sideAName, setSideAName] = useState('');
  const [sideBName, setSideBName] = useState('');
  const [status, setStatus] = useState('SCHEDULED');
  const [winnerId, setWinnerId] = useState('');
  const [targetPoints, setTargetPoints] = useState<number>(21);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const isDoublesCategory = selectedCategoryObj?.type?.includes('DOUBLES');
  const [sideATeamId, setSideATeamId] = useState('');
  const [sideBTeamId, setSideBTeamId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = `/api/v1/matches?search=${encodeURIComponent(search.trim())}`;
      if (categoryFilter) query += `&categoryId=${categoryFilter}`;
      if (courtFilter) query += `&courtId=${courtFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (roundFilter) query += `&round=${encodeURIComponent(roundFilter)}`;

      const [matchRes, tournRes, catRes, courtRes, teamRes] = await Promise.all([
        fetch(query),
        fetch('/api/v1/tournaments'),
        fetch('/api/v1/categories'),
        fetch('/api/v1/courts'),
        fetch('/api/v1/teams'),
      ]);

      const mData = await matchRes.json();
      const tData = await tournRes.json();
      const cData = await catRes.json();
      const crtData = await courtRes.json();
      const tmData = await teamRes.json();

      setMatches(mData.matches || []);
      setTournaments(tData.tournaments || []);
      setCategories(cData.categories || []);
      setCourts(crtData.courts || []);
      setTeams(tmData.teams || []);

      const activeTournId = tData.tournaments?.length > 0 ? tData.tournaments[0].id : '';
      const catWithMatches = cData.categories?.find((c: any) => c._count?.matches > 0);
      const defaultCatId = catWithMatches ? catWithMatches.id : (cData.categories?.length > 0 ? cData.categories[0].id : '');
      const activeCatId = categoryFilter || defaultCatId;

      if (activeTournId && !tournamentId) setTournamentId(activeTournId);
      if (activeCatId && !categoryId) setCategoryId(activeCatId);

      // Fetch group standings if tournament & category exist
      if (activeTournId && activeCatId) {
        fetchGroupStandings(activeTournId, activeCatId);
      }
    } catch (err) {
      showToast('Failed to load matches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupStandings = async (tId: string, cId: string) => {
    try {
      const res = await fetch(`/api/v1/matches/group-standings?tournamentId=${tId}&categoryId=${cId}`);
      const data = await res.json();
      if (res.ok) {
        setGroupStandings(data.groups || {});
        setGroupProgress(data.progress || null);
      }
    } catch (err) {
      console.error('Failed to fetch group standings:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter, courtFilter, statusFilter, roundFilter]);

  const handleSelectTeamForSide = (side: 'A' | 'B', selectedTeamId: string) => {
    if (!selectedTeamId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    if (side === 'A') {
      setSideATeamId(selectedTeamId);
      if (selectedTeamId === sideBTeamId) setFormError('A team cannot play against itself.');
      else setFormError(null);
    } else {
      setSideBTeamId(selectedTeamId);
      if (selectedTeamId === sideATeamId) setFormError('A team cannot play against itself.');
      else setFormError(null);
    }

    if (isDoublesCategory) {
      if (team.teamPlayers && team.teamPlayers.length >= 2) {
        const pairNames = team.teamPlayers.map((tp: any) => tp.player.name).slice(0, 2).join(' / ');
        const fullName = `${pairNames} (${team.name})`;
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

  const openCreateModal = () => {
    setEditingMatch(null);
    setRound('Quarter Finals');
    setCourtId(courts[0]?.id || '');
    setScheduledAt('');
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
    setRound(m.round || 'Quarter Finals');
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

    const trimmedSideA = sideAName.trim();
    const trimmedSideB = sideBName.trim();

    if (!tournamentId || !categoryId || !trimmedSideA || !trimmedSideB) {
      setFormError('Tournament, Category, and Participant names are required.');
      return;
    }

    if (trimmedSideA.toLowerCase() === trimmedSideB.toLowerCase()) {
      setFormError('A team cannot play against itself.');
      return;
    }

    const payload = {
      tournamentId,
      categoryId,
      courtId: courtId || undefined,
      round: round.trim() || 'Quarter Finals',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      sideAType: sideATeamId ? 'TEAM' : 'PLAYER',
      sideAId: sideATeamId || 'TBD',
      sideAName: trimmedSideA,
      sideBType: sideBTeamId ? 'TEAM' : 'PLAYER',
      sideBId: sideBTeamId || 'TBD',
      sideBName: trimmedSideB,
      status,
      winnerId: winnerId || undefined,
      targetPoints,
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

      showToast(editingMatch ? 'Fixture updated successfully' : 'Fixture created successfully');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError('Network error while saving fixture.');
    }
  };

  const openGeneratorModal = () => {
    if (!tournamentId) {
      showToast('Please select a Tournament first', 'error');
      return;
    }

    const initialCatId = categoryId || (categories.filter((c: any) => c.tournamentId === tournamentId)[0]?.id || '');

    setIsGeneratorModalOpen(true);
    setGeneratorStep('CATEGORY');
    setWizardCategoryId(initialCatId);
    setSelectedFormat('');
    setEligibleParticipants([]);
    setExcludedParticipants([]);
    setGeneratorPreview(null);
    setConfirmGenerateChecked(false);
  };

  const loadEligibleParticipants = async (catId: string) => {
    if (!catId || !tournamentId) return;
    setIsLoadingParticipants(true);
    setEligibleParticipants([]);
    setExcludedParticipants([]);

    try {
      const res = await fetch('/api/v1/matches/eligible-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ tournamentId, categoryId: catId }),
      });
      const data = await res.json();
      if (res.ok) {
        setEligibleParticipants(data.eligible || []);
        setExcludedParticipants(data.excluded || []);
      } else {
        showToast(data.error || 'Failed to load participants', 'error');
        setGeneratorStep('CATEGORY');
      }
    } catch {
      showToast('Network error loading participants', 'error');
      setGeneratorStep('CATEGORY');
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleCategoryNext = async () => {
    if (!wizardCategoryId) {
      showToast('Please select a category', 'error');
      return;
    }
    setGeneratorStep('PARTICIPANTS');
    await loadEligibleParticipants(wizardCategoryId);
  };

  const loadPreviewForFormat = async (fmt: 'ROUND_ROBIN' | 'GROUP_STAGE' | 'KNOCKOUT') => {
    setSelectedFormat(fmt);
    setGeneratorStep('PREVIEW');
    setIsPreviewLoading(true);
    setGeneratorPreview(null);
    setConfirmGenerateChecked(false);

    try {
      const res = await fetch('/api/v1/matches/preview-fixtures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          tournamentId,
          categoryId: wizardCategoryId,
          format: fmt === 'GROUP_STAGE' ? 'GROUP_KNOCKOUT' : fmt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratorPreview(data.preview);
      } else {
        showToast(data.error || 'Failed to load fixture preview', 'error');
        setGeneratorStep('FORMAT');
      }
    } catch {
      showToast('Network error while loading preview', 'error');
      setGeneratorStep('FORMAT');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmGenerateFixtures = async (confirmRegenerate = false) => {
    if (isGenerating) return;

    const apiFormat =
      selectedFormat === 'GROUP_STAGE' ? 'GROUP_KNOCKOUT' :
      selectedFormat === 'ROUND_ROBIN' ? 'ROUND_ROBIN' :
      selectedFormat === 'KNOCKOUT' ? 'KNOCKOUT' : 'KNOCKOUT';

    if (apiFormat === 'GROUP_KNOCKOUT' && generatorPreview?.totalTeams < 6) {
      showToast('Group Round Robin + Knockout requires at least 6 eligible teams.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/v1/matches/generate-fixtures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ tournamentId, categoryId: wizardCategoryId, confirmRegenerate, format: apiFormat }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to generate fixtures', 'error');
      } else {
        showToast(data.message || 'Fixtures generated successfully!');
        setIsGeneratorModalOpen(false);
        // Sync page category to the wizard's selected category
        if (wizardCategoryId && wizardCategoryId !== categoryId) setCategoryId(wizardCategoryId);
        fetchData();
      }
    } catch {
      showToast('Network error while generating fixtures', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSingleMatch = async () => {
    if (!deleteTargetId || isDeletingSingle) return;

    setIsDeletingSingle(true);
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
      showToast('Network error while deleting fixture', 'error');
    } finally {
      setIsDeletingSingle(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteAllFixtures = async () => {
    if (isDeletingAll) return;

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
        showToast(data.message || 'All fixtures deleted successfully');
        setIsDeleteAllModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast('Network error while deleting fixtures', 'error');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-brand-500" /> Fixture & Bracket Management
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Automated Group Stage (max 3 per group) & Knockout Bracket generator
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {matches.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition"
              >
                <Trash2 className="w-4 h-4" /> Clear All Fixtures
              </button>
            )}

            <button
              type="button"
              onClick={openGeneratorModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-amber hover:bg-amber-600 text-dark-900 font-bold text-xs transition shadow-lg glow-cyan"
            >
              <Zap className="w-4 h-4" /> Generate Fixtures
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow-lg glow-green"
            >
              <Plus className="w-4 h-4" /> Add Fixture
            </button>
          </div>
        </div>

        {/* View Controls & Category Bar */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border border-slate-700/60">
          {/* Stage Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-dark-800 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStageTab('KNOCKOUT')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                stageTab === 'KNOCKOUT' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Knockout Bracket</span>
            </button>
            <button
              type="button"
              onClick={() => setStageTab('GROUP_STAGE')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                stageTab === 'GROUP_STAGE' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Group Stage</span>
            </button>
          </div>

          {/* Bracket Tree vs List View Toggle */}
          {stageTab === 'KNOCKOUT' && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-dark-800 p-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('BRACKET_TREE')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'BRACKET_TREE' ? 'bg-accent-amber text-dark-900 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Bracket Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST_VIEW')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'LIST_VIEW' ? 'bg-accent-amber text-dark-900 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">List View</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters Bar */}
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
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              if (tournamentId && e.target.value) fetchGroupStandings(tournamentId, e.target.value);
            }}
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

        {/* Content Display */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> Loading fixtures & standings...
          </div>
        ) : stageTab === 'GROUP_STAGE' ? (
          <GroupStageView groups={groupStandings} progress={groupProgress} />
        ) : viewMode === 'BRACKET_TREE' ? (
          <VisualBracketTree matches={matches} onSelectMatch={(m) => openEditModal(m)} />
        ) : (
          /* List View */
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl text-center space-y-3">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Fixtures Scheduled</h3>
                <p className="text-slate-400 text-xs">Use the Auto Fixture Generator or click &apos;Add Fixture&apos;.</p>
              </div>
            ) : (
              matches.map((m) => (
                <div
                  key={m.id}
                  className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-brand-500"
                >
                  <div className="space-y-1 w-full md:w-auto">
                    <div className="flex items-center gap-2 text-[11px] flex-wrap">
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

                    <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base font-bold text-white py-1 flex-wrap">
                      <span className={`break-words ${m.winnerId === m.sideAId ? 'text-brand-400 font-extrabold' : ''}`}>
                        {formatBracketParticipant(m.sideAId, m.sideAName).displayName}
                      </span>
                      <span className="text-slate-500 text-xs font-normal">vs</span>
                      <span className={`break-words ${m.winnerId === m.sideBId ? 'text-brand-400 font-extrabold' : ''}`}>
                        {formatBracketParticipant(m.sideBId, m.sideBName).displayName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs text-slate-400 w-full md:w-auto justify-between md:justify-end border-t border-slate-800 md:border-t-0 pt-3 md:pt-0">
                    <div className="space-y-1 text-left sm:text-right">
                      <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                        <Clock className="w-3.5 h-3.5 text-accent-amber shrink-0" />
                        <span>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{m.court?.name || 'Court Unassigned'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        to={`/scorer/match/${m.id}`}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs border border-amber-500/30 transition flex items-center gap-1"
                      >
                        <Radio className="w-3.5 h-3.5" /> Score
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="p-2 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(m.id)}
                        className="p-2 rounded-xl bg-dark-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Manual Fixture Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingMatch ? 'Edit Fixture' : 'Create Fixture'}</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{formError}</div>
            )}

            <form onSubmit={handleSaveMatch} className="space-y-3 text-xs" noValidate>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-300 font-semibold">Side A Name *</label>
                    {teams.length > 0 && (
                      <select
                        onChange={(e) => handleSelectTeamForSide('A', e.target.value)}
                        className="text-[10px] bg-dark-800 border border-slate-700 text-brand-400 rounded px-1.5 py-0.5"
                        defaultValue=""
                      >
                        <option value="" disabled>Pick Team...</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sideAName}
                    onChange={(e) => setSideAName(e.target.value)}
                    placeholder="Team A Name"
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
                        className="text-[10px] bg-dark-800 border border-slate-700 text-brand-400 rounded px-1.5 py-0.5"
                        defaultValue=""
                      >
                        <option value="" disabled>Pick Team...</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    value={sideBName}
                    onChange={(e) => setSideBName(e.target.value)}
                    placeholder="Team B Name"
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
                    placeholder="Quarter Finals"
                    className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Court</label>
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

      {/* â”€â”€ Fixture Generator Wizard â€” 4-step â”€â”€ */}
      {isGeneratorModalOpen && (() => {
        const wizardCat = categories.find((c: any) => c.id === wizardCategoryId);
        const catLabel = wizardCat?.type?.replace(/_/g, ' ') || 'Unknown Category';
        const tournamentCats = categories.filter((c: any) => c.tournamentId === tournamentId);
        const stepTitles: Record<string, string> = {
          CATEGORY: 'Step 1 â€” Select Category',
          PARTICIPANTS: 'Step 2 â€” Eligible Participants',
          FORMAT: 'Step 3 â€” Tournament Format',
          PREVIEW: 'Step 4 â€” Preview & Confirm',
        };
        const stepNum: Record<string, number> = { CATEGORY: 1, PARTICIPANTS: 2, FORMAT: 3, PREVIEW: 4 };

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-amber-500/30 max-h-[90vh] overflow-y-auto">

              {/* Modal header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent-amber" />
                    {stepTitles[generatorStep]}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {(['CATEGORY', 'PARTICIPANTS', 'FORMAT', 'PREVIEW'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border ${
                          generatorStep === s
                            ? 'bg-accent-amber border-amber-500 text-dark-900'
                            : stepNum[generatorStep] > i + 1
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-dark-800 border-slate-700 text-slate-500'
                        }`}>{i + 1}</div>
                        {i < 3 && <div className={`w-6 h-px ${stepNum[generatorStep] > i + 1 ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />}
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => setIsGeneratorModalOpen(false)} className="text-slate-400 hover:text-white shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* â”€â”€ STEP 1: CATEGORY â”€â”€ */}
              {generatorStep === 'CATEGORY' && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs">Choose the event category for which fixtures will be generated. Only participants eligible for this category will be included.</p>

                  <div className="space-y-2">
                    {tournamentCats.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        No categories found for this tournament. Please create categories first.
                      </div>
                    ) : (
                      tournamentCats.map((cat: any) => {
                        const isSelected = wizardCategoryId === cat.id;
                        const catTypeLabel = cat.type?.replace(/_/g, ' ') || cat.type;
                        const isDoubles = cat.type?.includes('DOUBLES');
                        const isSingles = cat.type?.includes('SINGLES');
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setWizardCategoryId(cat.id)}
                            className={`w-full text-left p-3.5 rounded-xl border transition flex items-center gap-3 ${
                              isSelected
                                ? 'bg-brand-500/15 border-brand-500/60 ring-1 ring-brand-500/40'
                                : 'bg-dark-800 border-slate-700 hover:border-slate-600 hover:bg-dark-700'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-brand-500/30 text-brand-400' : 'bg-dark-700 text-slate-400'
                            }`}>
                              {isDoubles ? <Users className="w-4 h-4" /> : isSingles ? <Users className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>{catTypeLabel}</p>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                {isDoubles ? 'Doubles â€” 2 players per team' : isSingles ? 'Singles â€” 1 player per entry' : 'Team event'}
                              </p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-brand-400 bg-brand-400' : 'border-slate-600'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                    <button type="button" onClick={() => setIsGeneratorModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                      Cancel
                    </button>
                    <button type="button" onClick={handleCategoryNext} disabled={!wizardCategoryId || tournamentCats.length === 0}
                      className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition">
                      View Eligible Participants <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 2: PARTICIPANTS â”€â”€ */}
              {generatorStep === 'PARTICIPANTS' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <button type="button" onClick={() => setGeneratorStep('CATEGORY')} className="hover:text-white transition">â† Back</button>
                    <span>Â·</span>
                    <span className="text-white font-semibold">{catLabel}</span>
                  </div>

                  {isLoadingParticipants ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-amber" /> Filtering eligible participants...
                    </div>
                  ) : (
                    <>
                      {/* Eligible count banner */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        eligibleParticipants.length >= 2
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            eligibleParticipants.length >= 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-accent-amber'
                          }`}>
                            {eligibleParticipants.length >= 2 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`font-extrabold text-xs ${eligibleParticipants.length >= 2 ? 'text-emerald-400' : 'text-accent-amber'}`}>
                              {eligibleParticipants.length} eligible {eligibleParticipants.length === 1 ? 'participant' : 'participants'} found
                            </p>
                            <p className="text-slate-400 text-[11px]">
                              {excludedParticipants.length > 0 ? `${excludedParticipants.length} excluded` : 'All registered entries are eligible'}
                            </p>
                          </div>
                        </div>
                        {eligibleParticipants.length < 2 && (
                          <span className="text-[10px] text-amber-300 font-semibold">Min. 2 required</span>
                        )}
                      </div>

                      {/* Eligible list */}
                      {eligibleParticipants.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Eligible ({eligibleParticipants.length})
                          </h4>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {eligibleParticipants.map((p: any, i: number) => (
                              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-dark-800 border border-emerald-500/15 text-xs">
                                <span className="text-slate-500 font-mono w-5 shrink-0 text-right">{i + 1}.</span>
                                <span className="text-white font-medium truncate flex-1">{p.name}</span>
                                <span className="text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">âœ“</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Excluded list */}
                      {excludedParticipants.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5 text-rose-400" /> Excluded ({excludedParticipants.length})
                          </h4>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {excludedParticipants.map((p: any) => (
                              <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-dark-900 border border-rose-500/10 text-xs">
                                <span className="text-white font-medium shrink-0">{p.name}</span>
                                <span className="text-rose-400 text-[10px] ml-auto shrink-0 text-right leading-tight">{p.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {eligibleParticipants.length === 0 && excludedParticipants.length === 0 && (
                        <div className="p-4 rounded-xl bg-dark-800 border border-slate-700 text-center text-slate-400 text-xs">
                          No teams or players found for this tournament. Add teams first.
                        </div>
                      )}

                      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                        <button type="button" onClick={() => setGeneratorStep('CATEGORY')}
                          className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                          â† Back
                        </button>
                        <button type="button" onClick={() => setGeneratorStep('FORMAT')} disabled={eligibleParticipants.length < 2}
                          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition">
                          Choose Format <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* â”€â”€ STEP 3: FORMAT â”€â”€ */}
              {generatorStep === 'FORMAT' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <button type="button" onClick={() => setGeneratorStep('PARTICIPANTS')} className="hover:text-white transition">â† Back</button>
                    <span>Â·</span>
                    <span className="text-white font-semibold">{catLabel}</span>
                    <span>Â·</span>
                    <span className="text-emerald-400">{eligibleParticipants.length} eligible</span>
                  </div>

                  <p className="text-slate-400 text-xs">Select how fixtures will be generated for {eligibleParticipants.length} eligible participants.</p>

                  <div className="space-y-3">
                    {/* Option 1: Knockout Only */}
                    <button type="button" onClick={() => loadPreviewForFormat('KNOCKOUT')}
                      className="w-full text-left p-4 rounded-2xl bg-dark-800 border border-slate-700 hover:border-accent-cyan/60 hover:bg-dark-700 transition group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-accent-cyan flex items-center justify-center shrink-0 group-hover:bg-cyan-500/25 transition">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">1. Knockout Only</span>
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-accent-cyan text-[10px] font-bold border border-cyan-500/30 uppercase">Bracket</span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            All eligible participants placed directly into a single-elimination bracket. Lose once and you're out. No groups created.
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-accent-cyan shrink-0 mt-3 transition" />
                      </div>
                    </button>

                    {/* Option 2: Round Robin Only */}
                    <button type="button" onClick={() => loadPreviewForFormat('ROUND_ROBIN')}
                      className="w-full text-left p-4 rounded-2xl bg-dark-800 border border-slate-700 hover:border-brand-500/60 hover:bg-dark-700 transition group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center shrink-0 group-hover:bg-brand-500/25 transition">
                          <List className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-sm">2. Round Robin Only</span>
                            <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold border border-brand-500/30 uppercase">League</span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            Every participant plays every other participant exactly once. No groups. No knockout. Final standings determine the winner.
                            {' '}<span className="text-brand-400 font-medium">
                              {eligibleParticipants.length} teams â†’ {Math.floor(eligibleParticipants.length * (eligibleParticipants.length - 1) / 2)} matches
                            </span>
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 shrink-0 mt-3 transition" />
                      </div>
                    </button>

                    {/* Option 3: Group Round Robin + Knockout */}
                    <button type="button"
                      onClick={() => eligibleParticipants.length >= 6 ? loadPreviewForFormat('GROUP_STAGE') : undefined}
                      disabled={eligibleParticipants.length < 6}
                      className={`w-full text-left p-4 rounded-2xl border transition group ${
                        eligibleParticipants.length >= 6
                          ? 'bg-dark-800 border-slate-700 hover:border-emerald-500/60 hover:bg-dark-700'
                          : 'bg-dark-900 border-slate-800 opacity-60 cursor-not-allowed'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                          eligibleParticipants.length >= 6
                            ? 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-600'
                        }`}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm">3. Group Round Robin + Knockout</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase">Groups + KO</span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            Participants split into groups (max 3/group). Round robin within each group. Top teams qualify for the knockout bracket.
                            {eligibleParticipants.length < 6
                              ? <span className="text-amber-400 font-semibold"> Requires â‰¥ 6 eligible participants ({eligibleParticipants.length} found).</span>
                              : <span className="text-emerald-400 font-semibold"> {eligibleParticipants.length} eligible â†’ {Math.ceil(eligibleParticipants.length / 3)} groups.</span>
                            }
                          </p>
                        </div>
                        {eligibleParticipants.length >= 6 && (
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 shrink-0 mt-3 transition" />
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="pt-3 flex justify-end border-t border-slate-800">
                    <button type="button" onClick={() => setIsGeneratorModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 4: PREVIEW + CONFIRM â”€â”€ */}
              {generatorStep === 'PREVIEW' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <button type="button" onClick={() => setGeneratorStep('FORMAT')} className="hover:text-white transition">â† Back</button>
                    <span>Â·</span>
                    <span className="text-white font-semibold">{catLabel}</span>
                    <span>Â·</span>
                    <span className={`font-semibold ${
                      selectedFormat === 'ROUND_ROBIN' ? 'text-brand-400' :
                      selectedFormat === 'GROUP_STAGE' ? 'text-emerald-400' : 'text-accent-cyan'
                    }`}>
                      {selectedFormat === 'ROUND_ROBIN' ? 'Round Robin Only' :
                       selectedFormat === 'GROUP_STAGE' ? 'Group Round Robin + Knockout' : 'Knockout Only'}
                    </span>
                  </div>

                  {isPreviewLoading ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-amber" /> Calculating fixture preview...
                    </div>
                  ) : generatorPreview ? (
                    <div className="space-y-3 text-xs">

                      {/* Format header badge */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        selectedFormat === 'ROUND_ROBIN' ? 'bg-brand-500/10 border-brand-500/30' :
                        selectedFormat === 'GROUP_STAGE' ? 'bg-emerald-500/10 border-emerald-500/30' :
                        'bg-cyan-500/10 border-cyan-500/30'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            selectedFormat === 'ROUND_ROBIN' ? 'bg-brand-500/20 text-brand-400' :
                            selectedFormat === 'GROUP_STAGE' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-cyan-500/20 text-accent-cyan'
                          }`}>
                            {selectedFormat === 'ROUND_ROBIN' ? <List className="w-4 h-4" /> :
                             selectedFormat === 'GROUP_STAGE' ? <Shield className="w-4 h-4" /> :
                             <Layers className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className={`font-extrabold text-xs ${
                              selectedFormat === 'ROUND_ROBIN' ? 'text-brand-400' :
                              selectedFormat === 'GROUP_STAGE' ? 'text-emerald-400' : 'text-accent-cyan'
                            }`}>
                              {selectedFormat === 'ROUND_ROBIN' ? 'Round Robin Only' :
                               selectedFormat === 'GROUP_STAGE' ? 'Group Round Robin + Knockout' : 'Knockout Only'}
                            </h4>
                            <p className="text-slate-400 text-[11px]">{catLabel}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-slate-700 font-bold text-[10px] text-slate-300 uppercase">
                          {generatorPreview.totalTeams} eligible
                        </span>
                      </div>

                      {/* Summary card */}
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-700 space-y-2">
                        {selectedFormat === 'ROUND_ROBIN' && (
                          <>
                            <div className="flex justify-between"><span className="text-slate-400">Format:</span><span className="font-extrabold text-brand-400">Round Robin Only</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Eligible Participants:</span><span className="font-bold text-white">{generatorPreview.totalTeams}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Total Matches:</span><span className="font-bold text-amber-400">{generatorPreview.totalRoundRobinMatches} matches</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Knockout:</span><span className="font-semibold text-slate-500">None â€” League standings only</span></div>
                          </>
                        )}
                        {selectedFormat === 'GROUP_STAGE' && (
                          <>
                            <div className="flex justify-between"><span className="text-slate-400">Format:</span><span className="font-extrabold text-emerald-400">Group Round Robin + Knockout</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Eligible Participants:</span><span className="font-bold text-white">{generatorPreview.totalTeams}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Groups (max 3/group):</span><span className="font-bold text-accent-cyan">{generatorPreview.numberOfGroups} groups</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Group Fixtures:</span><span className="font-bold text-amber-400">{generatorPreview.totalGroupMatches} matches</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Qualification:</span><span className="font-bold text-emerald-400">{generatorPreview.qualificationRule}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Knockout:</span><span className="font-bold text-white">{generatorPreview.knockoutStructure}</span></div>
                          </>
                        )}
                        {selectedFormat === 'KNOCKOUT' && (
                          <>
                            <div className="flex justify-between"><span className="text-slate-400">Format:</span><span className="font-extrabold text-accent-cyan">Knockout Only</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Eligible Participants:</span><span className="font-bold text-white">{generatorPreview.totalTeams}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Bracket:</span><span className="font-bold text-white">{generatorPreview.knockoutStructure}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Groups:</span><span className="font-semibold text-slate-500">None â€” Direct bracket</span></div>
                          </>
                        )}
                      </div>

                      {/* Group distribution (Group Stage only) */}
                      {selectedFormat === 'GROUP_STAGE' && generatorPreview.groups?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Group Distribution:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {generatorPreview.groups.map((g: any) => (
                              <div key={g.id} className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 text-[11px]">
                                <div className="font-bold text-white flex justify-between items-center mb-1">
                                  <span>{g.name}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 text-[10px] font-bold">{g.teamCount}T Â· {g.matchesCount}M</span>
                                </div>
                                <p className="text-slate-400 truncate">{g.teamNames.join(', ')}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Excluded note */}
                      {generatorPreview.totalExcluded > 0 && (
                        <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 text-xs flex items-center gap-2 text-slate-400">
                          <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          {generatorPreview.totalExcluded} participant{generatorPreview.totalExcluded > 1 ? 's' : ''} excluded (wrong category/gender).
                        </div>
                      )}

                      {/* Existing fixtures warning */}
                      {generatorPreview.fixturesExist && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>{generatorPreview.existingMatchesCount} existing fixtures will be deleted and recreated.</strong>
                            <p className="mt-0.5 text-[11px] text-amber-200/80">Scores and standings for this category will be reset.</p>
                          </div>
                        </div>
                      )}

                      {/* Confirmation checkbox */}
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-dark-800/90 border border-slate-700/80 cursor-pointer select-none hover:border-slate-600 transition">
                        <input type="checkbox" checked={confirmGenerateChecked} onChange={(e) => setConfirmGenerateChecked(e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 text-brand-500 focus:ring-brand-500 cursor-pointer" />
                        <span className="text-slate-300 text-xs leading-relaxed">
                          I confirm: generate{' '}
                          <strong className="text-white">
                            {selectedFormat === 'ROUND_ROBIN' ? 'Round Robin Only' :
                             selectedFormat === 'GROUP_STAGE' ? 'Group Round Robin + Knockout' : 'Knockout Only'}
                          </strong>{' '}
                          fixtures for <strong className="text-white">{generatorPreview.totalTeams} eligible {catLabel} participants</strong>.
                          {generatorPreview.totalExcluded > 0 && ` (${generatorPreview.totalExcluded} excluded by category filter.)`}
                        </span>
                      </label>

                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                        <button type="button" onClick={() => setIsGeneratorModalOpen(false)} disabled={isGenerating}
                          className="px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs">
                          Cancel
                        </button>
                        <button type="button" onClick={() => handleConfirmGenerateFixtures(generatorPreview.fixturesExist)}
                          disabled={isGenerating || !confirmGenerateChecked}
                          className="px-4 py-2.5 rounded-xl bg-accent-amber hover:bg-amber-600 text-dark-900 font-extrabold text-xs flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition">
                          {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {generatorPreview.fixturesExist ? 'Regenerate Fixtures' : 'Generate Fixtures'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

            </div>
          </div>
        );
      })()}




      {/* Delete Single Match Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Fixture?"
        message="This action will permanently remove this match from the schedule."
        confirmText="Delete Fixture"
        isDanger={true}
        isLoading={isDeletingSingle}
        onConfirm={handleDeleteSingleMatch}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Delete All Fixtures Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAllModalOpen}
        title="Clear All Fixtures?"
        message={`This will permanently remove all ${matches.length} fixture(s) and reset group standings. This action cannot be undone.`}
        confirmText="Clear All Fixtures"
        isDanger={true}
        isLoading={isDeletingAll}
        onConfirm={handleDeleteAllFixtures}
        onCancel={() => setIsDeleteAllModalOpen(false)}
      />
    </AdminLayout>
  );
};
