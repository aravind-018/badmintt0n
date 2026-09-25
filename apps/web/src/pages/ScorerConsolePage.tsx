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

  // Fetch match details & scoring state
  const fetchScoringState = async (mId: string) => {
    if (!mId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/matches/${mId}/scoring`);
      const data = await res.json();
      setMatchData(data.match);
      setScoringState(data.state);
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

  // Dispatch scoring event to backend
  const handleScoringEvent = async (type: string, side?: 'A' | 'B') => {
    if (!selectedMatchId || actionLoading) return;

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
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
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
              <span>Match Score:</span>
              <span className="font-bold text-white font-mono text-sm">
                {scoringState?.sideAGamesWon || 0} - {scoringState?.sideBGamesWon || 0}
              </span>
            </div>
          </div>

          {/* Scheduled / Completed Special Actions Notice */}
          {isScheduled && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-indigo-300">
                Match is scheduled. Click <strong>+1 Point</strong> or <strong>Start Match</strong> to begin live scoring.
              </div>
              <button
                onClick={() => handleScoringEvent('POINT_SIDE_A', 'A')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Match & Score
              </button>
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

          {/* Primary Scoring Touch Pad Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* SIDE A CARD */}
            <div
              className={`bg-slate-900/60 p-6 rounded-3xl flex flex-col justify-between border-2 transition-all duration-300 ${
                scoringState?.winner === 'A'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">SIDE A</div>
                <h2 className="text-2xl sm:text-3xl font-black text-white truncate">{matchData.sideAName}</h2>
                <div className="text-xs text-slate-400">Games Won: {scoringState?.sideAGamesWon || 0}</div>
              </div>

              {/* Big Score Display */}
              <div className="my-6 text-center">
                <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                  {currentGame.sideAPoints}
                </div>
              </div>

              {/* Large Touch Button */}
              <button
                onClick={() => handleScoringEvent('POINT_SIDE_A', 'A')}
                disabled={actionLoading || isMatchComplete}
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xl shadow-2xl active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none select-none"
              >
                +1 POINT ({matchData.sideAName})
              </button>
            </div>

            {/* SIDE B CARD */}
            <div
              className={`bg-slate-900/60 p-6 rounded-3xl flex flex-col justify-between border-2 transition-all duration-300 ${
                scoringState?.winner === 'B'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">SIDE B</div>
                <h2 className="text-2xl sm:text-3xl font-black text-white truncate">{matchData.sideBName}</h2>
                <div className="text-xs text-slate-400">Games Won: {scoringState?.sideBGamesWon || 0}</div>
              </div>

              {/* Big Score Display */}
              <div className="my-6 text-center">
                <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-white drop-shadow-lg">
                  {currentGame.sideBPoints}
                </div>
              </div>

              {/* Large Touch Button */}
              <button
                onClick={() => handleScoringEvent('POINT_SIDE_B', 'B')}
                disabled={actionLoading || isMatchComplete}
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xl shadow-2xl active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none select-none"
              >
                +1 POINT ({matchData.sideBName})
              </button>
            </div>
          </div>

          {/* Controls Footer Toolbar */}
          <div className="bg-slate-900 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold border border-slate-800">
            <button
              onClick={() => handleScoringEvent('UNDO')}
              disabled={actionLoading}
              className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" /> UNDO LAST POINT
            </button>

            {scoringState?.status === 'PAUSED' ? (
              <button
                onClick={() => handleScoringEvent('RESUME')}
                disabled={actionLoading}
                className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 flex items-center justify-center gap-2 transition"
              >
                <Play className="w-4 h-4" /> RESUME MATCH
              </button>
            ) : (
              <button
                onClick={() => handleScoringEvent('PAUSE')}
                disabled={actionLoading || isMatchComplete}
                className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 flex items-center justify-center gap-2 transition"
              >
                <Pause className="w-4 h-4" /> PAUSE MATCH
              </button>
            )}

            <button
              onClick={() => handleScoringEvent('WALKOVER', 'A')}
              disabled={actionLoading || isMatchComplete}
              className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center gap-2 transition text-[11px]"
            >
              <Flag className="w-4 h-4 text-rose-400" /> WALKOVER / RETIRE
            </button>

            <button
              onClick={() => handleScoringEvent('COMPLETE')}
              disabled={actionLoading || isMatchComplete}
              className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" /> FINISH MATCH
            </button>
          </div>
        </main>
      )}
    </div>
  );
};
