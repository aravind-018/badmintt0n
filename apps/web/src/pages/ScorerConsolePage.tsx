import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Radio, RotateCcw, Pause, Play, CheckCircle2, ArrowLeft, Flag, RefreshCw } from 'lucide-react';

export const ScorerConsolePage: React.FC = () => {
  const { matchId } = useParams<{ matchId?: string }>();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matchId || '');
  const [matchData, setMatchData] = useState<any | null>(null);
  const [scoringState, setScoringState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch available matches and sort by priority (LIVE > SCHEDULED > COMPLETED)
  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/v1/matches');
      const data = await res.json();
      const list: any[] = data.matches || [];

      // Sort priority: LIVE > PAUSED > SCHEDULED > READY > COMPLETED / WALKOVER
      const statusPriority: Record<string, number> = {
        LIVE: 1,
        PAUSED: 2,
        SCHEDULED: 3,
        READY: 4,
        CALLED: 5,
        POSTPONED: 6,
        COMPLETED: 7,
        WALKOVER: 8,
        RETIRED: 9,
      };

      list.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));
      setMatches(list);

      if (list.length > 0 && !selectedMatchId) {
        // Auto pick first live or scheduled match
        const activeOrScheduled = list.find((m) => m.status === 'LIVE' || m.status === 'SCHEDULED' || m.status === 'PAUSED') || list[0];
        setSelectedMatchId(activeOrScheduled.id);
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    }
  };

  const [selectedServerName, setSelectedServerName] = useState<string>('');

  function getMatchPlayers(match: any): Array<{ name: string; side: 'A' | 'B'; teamName: string }> {
    if (!match) return [];
    const isDoubles = match.category?.type ? match.category.type.includes('DOUBLES') : false;
    const result: Array<{ name: string; side: 'A' | 'B'; teamName: string }> = [];

    const parseSide = (rawName: string | undefined, side: 'A' | 'B', defaultLabel: string) => {
      const raw = (rawName || defaultLabel).trim();
      if (isDoubles) {
        const cleaned = raw.replace(/\s*\([^)]*\)\s*$/, '');
        const parts = cleaned.split(/\s*[\/\&,]\s*/).filter(Boolean);
        if (parts.length >= 2) {
          parts.forEach((p) => result.push({ name: p.trim(), side, teamName: raw }));
        } else {
          result.push({ name: raw, side, teamName: raw });
        }
      } else {
        result.push({ name: raw, side, teamName: raw });
      }
    };

    parseSide(match.sideAName, 'A', 'Side A');
    parseSide(match.sideBName, 'B', 'Side B');
    return result;
  }

  // Fetch match details & scoring state
  const fetchScoringState = async (mId: string) => {
    if (!mId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${mId}/scoring`);
      const data = await res.json();
      setMatchData(data.match);
      setScoringState(data.state);

      const savedServer = data.match?.currentGameState?.initialServerName || data.state?.servingState?.serverName;
      if (savedServer) {
        setSelectedServerName(savedServer);
      } else {
        const playersList = getMatchPlayers(data.match);
        if (playersList.length > 0) {
          setSelectedServerName(playersList[0].name);
        }
      }
    } catch (err) {
      showToast('Failed to load match scoring state', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchScoringState(selectedMatchId);
    }
  }, [selectedMatchId]);

  const handleStartMatch = async () => {
    if (!selectedServerName) {
      showToast('Please select the starting server before starting the match.', 'error');
      return;
    }
    const playersList = getMatchPlayers(matchData);
    const chosenPlayer = playersList.find((p) => p.name === selectedServerName) || playersList[0];

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: 'LIVE',
          initialServerName: chosenPlayer.name,
          initialServingSide: chosenPlayer.side,
        }),
      });

      if (res.ok) {
        showToast(
          `Match started! Starting server: ${chosenPlayer.name} (${
            chosenPlayer.side === 'A' ? matchData?.sideAName : matchData?.sideBName
          })`
        );
        fetchScoringState(selectedMatchId);
        fetchMatches();
      } else {
        showToast('Failed to start match', 'error');
      }
    } catch (err) {
      showToast('Error starting match', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Dispatch scoring event to backend
  const handleScoringEvent = async (type: string, side?: 'A' | 'B') => {
    if (!selectedMatchId || actionLoading) return;

    // Validation: ensure initial server is selected before first point
    if (matchData?.status === 'SCHEDULED' || matchData?.status === 'READY') {
      if (!selectedServerName) {
        showToast('Please select the starting server before starting the match.', 'error');
        return;
      }
      // Save initial server first
      const playersList = getMatchPlayers(matchData);
      const chosenPlayer = playersList.find((p) => p.name === selectedServerName) || playersList[0];
      await fetch(`/api/v1/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: 'LIVE',
          initialServerName: chosenPlayer.name,
          initialServingSide: chosenPlayer.side,
        }),
      });
    }

    setActionLoading(true);
    const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

    try {
      const res = await fetch(`/api/v1/matches/${selectedMatchId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ type, side, requestId }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Scoring action rejected', 'error');
      } else {
        setMatchData(data.match);
        setScoringState(data.state);
        if (type === 'POINT_SIDE_A' || type === 'POINT_SIDE_B') {
          showToast(`+1 Point for ${side === 'A' ? matchData?.sideAName : matchData?.sideBName}`);
        } else if (type === 'UNDO') {
          showToast('Last point undone');
        } else {
          showToast(`Match status updated to ${type}`);
        }
      }
    } catch (err) {
      showToast('Network error processing score', 'error');
    } finally {
      setTimeout(() => {
        setActionLoading(false);
      }, 250);
    }
  };

  // Helper to re-open a completed match for live scoring
  const handleReopenMatch = async () => {
    if (!selectedMatchId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: 'LIVE',
          winnerId: null,
        }),
      });
      if (res.ok) {
        showToast('Match re-opened for live scoring', 'success');
        fetchScoringState(selectedMatchId);
        fetchMatches();
      } else {
        showToast('Failed to re-open match', 'error');
      }
    } catch (err) {
      showToast('Error re-opening match', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to change target score rule (11, 15, 21, 30 pts)
  const handleTargetPointsChange = async (pts: number) => {
    if (!selectedMatchId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ targetPoints: pts }),
      });
      if (res.ok) {
        showToast(`Target score updated to ${pts} pts`);
        fetchScoringState(selectedMatchId);
      } else {
        showToast('Failed to update target score', 'error');
      }
    } catch (err) {
      showToast('Error updating target score', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const currentGame = scoringState?.games?.[scoringState.currentGameNumber - 1] || {
    sideAPoints: 0,
    sideBPoints: 0,
    isDeuce: false,
  };

  const isMatchComplete = scoringState?.isMatchComplete || matchData?.status === 'COMPLETED' || matchData?.status === 'WALKOVER';
  const isScheduled = matchData?.status === 'SCHEDULED' || matchData?.status === 'READY';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-none font-sans">
      {/* Top Console Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white p-1 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {matchData?.court?.name || 'Court Scorer Console'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isMatchComplete
                      ? 'bg-slate-800 text-slate-400'
                      : scoringState?.status === 'LIVE'
                      ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  {matchData?.status || 'SCHEDULED'}
                </span>
              </div>
              <h1 className="text-base font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {matchData?.category?.type?.replace('_', ' ') || 'Badminton Match'} • {matchData?.round || 'Round 1'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Match Selector Dropdown */}
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {matches.map((m) => {
                const prefix = m.status === 'LIVE' ? '🔴 LIVE: ' : m.status === 'COMPLETED' ? '✓ COMPLETED: ' : '📅 ';
                return (
                  <option key={m.id} value={m.id}>
                    {prefix}{m.sideAName} vs {m.sideBName} ({m.round})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </header>

      {/* Main Touch Console Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading scorer terminal...
        </div>
      ) : !matchData ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          No match selected. Please choose a court match.
        </div>
      ) : (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col justify-between gap-6">
          {/* Status & Deuce Indicator Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Current Game:</span>
              <span className="text-indigo-400 font-extrabold">Game {scoringState?.currentGameNumber || 1}</span>
              {currentGame.isDeuce && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] animate-pulse">
                  DEUCE (2 Point Lead Required)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Max Points:</span>
                <select
                  value={scoringState?.targetPoints || 21}
                  onChange={(e) => handleTargetPointsChange(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-amber-400 font-bold px-2 py-0.5 rounded text-[11px] cursor-pointer"
                >
                  <option value={21}>21 pts (BWF)</option>
                  <option value={15}>15 pts</option>
                  <option value={11}>11 pts</option>
                  <option value={30}>30 pts</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span>Match Score:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {scoringState?.sideAGamesWon || 0} - {scoringState?.sideBGamesWon || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Match Setup & Starting Server Selection Panel */}
          {(isScheduled || (scoringState?.status !== 'LIVE' && scoringState?.events?.length === 0)) && (
            <div className="bg-slate-900/90 border border-amber-500/40 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-amber-400 animate-pulse" /> MATCH SETUP
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Select the starting server for the first rally before beginning live score recording
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  STARTING SERVER REQUIRED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team Details */}
                <div className="space-y-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Team A:</span>
                    <span className="font-bold text-white">{matchData?.sideAName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-800/80 pt-1.5">
                    <span className="text-slate-400 font-medium">Team B:</span>
                    <span className="font-bold text-white">{matchData?.sideBName}</span>
                  </div>
                </div>

                {/* Starting Server Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Starting Server <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedServerName}
                    onChange={(e) => setSelectedServerName(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-amber-500/50 text-white font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="">-- Select Starting Server --</option>
                    {getMatchPlayers(matchData).map((p, idx) => (
                      <option key={idx} value={p.name}>
                        {p.name} ({p.side === 'A' ? matchData?.sideAName : matchData?.sideBName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Server Preview Bar */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">SERVING TEAM</span>
                  <span className="font-extrabold text-white text-sm block mt-0.5">
                    {selectedServerName ? (
                      getMatchPlayers(matchData).find((p) => p.name === selectedServerName)?.side === 'A'
                        ? matchData?.sideAName
                        : matchData?.sideBName
                    ) : (
                      <span className="text-slate-500 font-normal italic">Select server above</span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">INITIAL SERVER</span>
                  <span className="font-extrabold text-amber-400 text-sm block mt-0.5">
                    {selectedServerName || 'None selected'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[11px] font-medium">SERVICE COURT</span>
                  <span className="font-black text-emerald-400 text-xs px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 inline-block mt-0.5">
                    RIGHT (0-0)
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStartMatch}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-900 font-extrabold text-sm rounded-xl shadow-lg glow-amber transition flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START MATCH</span>
                </button>
              </div>
            </div>
          )}

          {isMatchComplete && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-slate-400">
                This match is completed. Winner: <strong className="text-amber-400">{matchData.winnerId === matchData.sideAId ? matchData.sideAName : matchData.sideBName}</strong>
              </div>
              <button
                onClick={handleReopenMatch}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Re-open Match for Live Scoring
              </button>
            </div>
          )}

          {/* Live Serving & Service Court Status Box */}
          {scoringState?.servingState && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Serving Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs w-full md:w-auto flex-1">
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">CURRENT SERVER</span>
                  <span className="font-extrabold text-white text-sm truncate block mt-0.5" title={scoringState.servingState.serverName}>
                    {scoringState.servingState.serverName || 'TBD'}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">TEAM</span>
                  <span className="font-extrabold text-white text-sm truncate block mt-0.5" title={scoringState.servingState.servingTeamName}>
                    {scoringState.servingState.servingTeamName || 'Team'}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">SERVICE COURT</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                      scoringState.servingState.serviceCourt === 'RIGHT'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    }`}>
                      {scoringState.servingState.serviceCourt}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({scoringState.servingState.servingSide === 'A' ? currentGame.sideAPoints : currentGame.sideBPoints} pts)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">RECEIVER</span>
                  <span className="font-extrabold text-slate-200 text-sm truncate block mt-0.5" title={scoringState.servingState.receiverName}>
                    {scoringState.servingState.receiverName || 'TBD'}
                  </span>
                </div>
              </div>

              {/* Visual Badminton Court Diagrams (Side A vs Side B Service Courts) */}
              <div className="w-full md:w-auto bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-center gap-3">
                <div className="text-center">
                  <div className="text-[9px] font-bold text-slate-400 mb-1">BADMINTON COURT</div>
                  <div className="flex items-center gap-1 bg-emerald-900/40 p-2 rounded-lg border border-emerald-500/40 text-[10px] font-bold">
                    {/* Side A Court Half */}
                    <div className="grid grid-cols-2 gap-1 w-24">
                      <div className={`p-1.5 rounded text-center truncate ${
                        scoringState.servingState.servingSide === 'A' && scoringState.servingState.serviceCourt === 'LEFT'
                          ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                          : 'bg-emerald-800/40 text-emerald-200'
                      }`}>
                        LEFT
                      </div>
                      <div className={`p-1.5 rounded text-center truncate ${
                        scoringState.servingState.servingSide === 'A' && scoringState.servingState.serviceCourt === 'RIGHT'
                          ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                          : 'bg-emerald-800/40 text-emerald-200'
                      }`}>
                        RIGHT
                      </div>
                    </div>

                    {/* NET */}
                    <div className="w-1.5 h-10 bg-slate-300/80 rounded" title="NET" />

                    {/* Side B Court Half */}
                    <div className="grid grid-cols-2 gap-1 w-24">
                      <div className={`p-1.5 rounded text-center truncate ${
                        scoringState.servingState.servingSide === 'B' && scoringState.servingState.serviceCourt === 'RIGHT'
                          ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                          : 'bg-emerald-800/40 text-emerald-200'
                      }`}>
                        RIGHT
                      </div>
                      <div className={`p-1.5 rounded text-center truncate ${
                        scoringState.servingState.servingSide === 'B' && scoringState.servingState.serviceCourt === 'LEFT'
                          ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                          : 'bg-emerald-800/40 text-emerald-200'
                      }`}>
                        LEFT
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary Scoring Touch Pad Grid (2 Columns on mobile for one-hand access without vertical scrolling) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1 items-stretch">
            {/* SIDE A CARD */}
            <div
              className={`bg-slate-900/80 p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between border-2 transition-all duration-200 select-none ${
                scoringState?.winner === 'A'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : scoringState?.servingState?.servingSide === 'A'
                  ? 'border-amber-400/80 bg-amber-500/5'
                  : 'border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              <div className="text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-wider">SIDE A</span>
                  {scoringState?.servingState?.servingSide === 'A' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black animate-pulse">
                      🏸 SERVING ({scoringState.servingState.serviceCourt})
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-2xl font-extrabold text-white truncate" title={matchData.sideAName}>
                  {matchData.sideAName}
                </h2>
                <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Sets: {scoringState?.sideAGamesWon || 0}</div>
              </div>

              {/* Big Score Display */}
              <div className="my-2 sm:my-4 text-center">
                <div className="text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {currentGame.sideAPoints}
                </div>
              </div>

              {/* Large Touch Button */}
              <button
                onClick={() => handleScoringEvent('POINT_SIDE_A', 'A')}
                disabled={actionLoading || isMatchComplete}
                className="w-full py-4 sm:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:from-indigo-700 active:to-indigo-600 text-white font-black text-sm sm:text-xl shadow-xl active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none select-none touch-manipulation min-h-[54px]"
              >
                +1 POINT
              </button>
            </div>

            {/* SIDE B CARD */}
            <div
              className={`bg-slate-900/80 p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between border-2 transition-all duration-200 select-none ${
                scoringState?.winner === 'B'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : scoringState?.servingState?.servingSide === 'B'
                  ? 'border-amber-400/80 bg-amber-500/5'
                  : 'border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">SIDE B</span>
                  {scoringState?.servingState?.servingSide === 'B' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black animate-pulse">
                      🏸 SERVING ({scoringState.servingState.serviceCourt})
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-2xl font-extrabold text-white truncate" title={matchData.sideBName}>
                  {matchData.sideBName}
                </h2>
                <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Sets: {scoringState?.sideBGamesWon || 0}</div>
              </div>

              {/* Big Score Display */}
              <div className="my-2 sm:my-4 text-center">
                <div className="text-5xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight text-white drop-shadow-md">
                  {currentGame.sideBPoints}
                </div>
              </div>

              {/* Large Touch Button */}
              <button
                onClick={() => handleScoringEvent('POINT_SIDE_B', 'B')}
                disabled={actionLoading || isMatchComplete}
                className="w-full py-4 sm:py-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 text-white font-black text-sm sm:text-xl shadow-xl active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none select-none touch-manipulation min-h-[54px]"
              >
                +1 POINT
              </button>
            </div>
          </div>

          {/* Controls Footer Toolbar */}
          <div className="bg-slate-900 p-2.5 sm:p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs font-bold border border-slate-800">
            <button
              onClick={() => handleScoringEvent('UNDO')}
              disabled={actionLoading}
              className="py-2.5 sm:py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center gap-1.5 transition touch-manipulation min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" /> <span>UNDO LAST</span>
            </button>

            {scoringState?.status === 'PAUSED' ? (
              <button
                onClick={() => handleScoringEvent('RESUME')}
                disabled={actionLoading}
                className="py-2.5 sm:py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 flex items-center justify-center gap-1.5 transition touch-manipulation min-h-[44px]"
              >
                <Play className="w-4 h-4 shrink-0" /> <span>RESUME</span>
              </button>
            ) : (
              <button
                onClick={() => handleScoringEvent('PAUSE')}
                disabled={actionLoading || isMatchComplete}
                className="py-2.5 sm:py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 flex items-center justify-center gap-1.5 transition touch-manipulation min-h-[44px]"
              >
                <Pause className="w-4 h-4 shrink-0" /> <span>PAUSE</span>
              </button>
            )}

            <button
              onClick={() => handleScoringEvent('WALKOVER', 'A')}
              disabled={actionLoading || isMatchComplete}
              className="py-2.5 sm:py-3 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center gap-1.5 transition text-[11px] touch-manipulation min-h-[44px]"
            >
              <Flag className="w-4 h-4 text-rose-400 shrink-0" /> <span>WALKOVER</span>
            </button>

            <button
              onClick={() => handleScoringEvent('COMPLETE')}
              disabled={actionLoading || isMatchComplete}
              className="py-2.5 sm:py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition shadow-lg touch-manipulation min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" /> <span>FINISH MATCH</span>
            </button>
          </div>
        </main>
      )}
    </div>
  );
};
