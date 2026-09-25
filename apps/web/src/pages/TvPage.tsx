import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLiveMatches, LiveMatchEntry } from '../hooks/useLiveMatches';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─────────────────────────────────────────────────────────────
//  TV Score Panel
// ─────────────────────────────────────────────────────────────

function TvScorePanel({ entry, flashId }: { entry: LiveMatchEntry; flashId: string | null }) {
  const { match, state } = entry;
  const currentGame = state.games[state.currentGameNumber - 1] || state.games[0];
  const sideALabel = match.sideAName || 'TBD';
  const sideBLabel = match.sideBName || 'TBD';
  const isFlashing = flashId === match.id;

  const sideAScore = currentGame?.sideAPoints ?? 0;
  const sideBScore = currentGame?.sideBPoints ?? 0;

  const sideALeading = sideAScore > sideBScore;
  const sideBLeading = sideBScore > sideAScore;

  return (
    <div className={`tv-panel ${match.status === 'PAUSED' ? 'paused' : ''} ${isFlashing ? 'flash' : ''}`}>
      {/* Top strip */}
      <div className="tv-panel-top">
        <div className="tv-court-label">{match.court?.name || '—'}</div>
        <div className="tv-category">{match.category?.name || ''}</div>
        <div className="tv-round">{match.round || ''}</div>
        {match.status === 'LIVE' && (
          <div className="tv-live-chip">
            <span className="tv-live-dot" />
            LIVE
          </div>
        )}
        {match.status === 'PAUSED' && (
          <div className="tv-paused-chip">⏸ PAUSED</div>
        )}
        {match.status === 'COMPLETED' && (
          <div className="tv-done-chip">✓ FINAL</div>
        )}
      </div>

      {/* Main score area */}
      <div className="tv-score-row">
        {/* Side A */}
        <div className={`tv-side tv-side-a ${state.winner === 'A' ? 'tv-winner' : ''}`}>
          <div className="tv-player-names">
            <div className="tv-player-name">{sideALabel}</div>
          </div>
          <div className={`tv-score ${sideALeading ? 'tv-score-leading' : ''}`}>
            {sideAScore}
          </div>
        </div>

        {/* Center info */}
        <div className="tv-center">
          <div className="tv-set-scores">
            {state.games.map((g, i) => (
              <div
                key={i}
                className={`tv-set ${i === state.currentGameNumber - 1 && !state.isMatchComplete ? 'tv-set-current' : 'tv-set-done'}`}
              >
                <span className={g.winner === 'A' ? 'tv-set-winner' : ''}>{g.sideAPoints}</span>
                <span className="tv-set-dash">–</span>
                <span className={g.winner === 'B' ? 'tv-set-winner' : ''}>{g.sideBPoints}</span>
              </div>
            ))}
          </div>
          <div className="tv-games-row">
            <span className={`tv-games-won ${state.sideAGamesWon > state.sideBGamesWon ? 'tv-games-leader' : ''}`}>
              {state.sideAGamesWon}
            </span>
            <span className="tv-games-label">SETS</span>
            <span className={`tv-games-won ${state.sideBGamesWon > state.sideAGamesWon ? 'tv-games-leader' : ''}`}>
              {state.sideBGamesWon}
            </span>
          </div>
          {state.isMatchComplete && state.winner && (
            <div className="tv-winner-tag">
              🏆 {state.winner === 'A' ? sideALabel : sideBLabel} wins!
            </div>
          )}
        </div>

        {/* Side B */}
        <div className={`tv-side tv-side-b ${state.winner === 'B' ? 'tv-winner' : ''}`}>
          <div className={`tv-score ${sideBLeading ? 'tv-score-leading' : ''}`}>
            {sideBScore}
          </div>
          <div className="tv-player-names tv-names-right">
            <div className="tv-player-name">{sideBLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TV Page
// ─────────────────────────────────────────────────────────────

export function TvPage() {
  const { matches, connected, loading } = useLiveMatches();
  const time = useCurrentTime();
  const [flashId, setFlashId] = useState<string | null>(null);
  const [prevMatches, setPrevMatches] = useState<LiveMatchEntry[]>([]);

  // Detect score changes to flash panels
  useEffect(() => {
    matches.forEach((entry) => {
      const prev = prevMatches.find((m) => m.match.id === entry.match.id);
      if (prev) {
        const prevGame = prev.state.games[prev.state.currentGameNumber - 1];
        const curGame = entry.state.games[entry.state.currentGameNumber - 1];
        if (prevGame && curGame) {
          if (
            prevGame.sideAPoints !== curGame.sideAPoints ||
            prevGame.sideBPoints !== curGame.sideBPoints
          ) {
            setFlashId(entry.match.id);
            setTimeout(() => setFlashId(null), 800);
          }
        }
      }
    });
    setPrevMatches(matches);
  }, [matches]);

  const activeMatches = matches.filter(
    (m) => m.match.status === 'LIVE' || m.match.status === 'PAUSED'
  );
  const completedMatches = matches.filter((m) => m.match.status === 'COMPLETED');

  return (
    <div className="tv-page">
      {/* TV Header Bar */}
      <div className="tv-header">
        <div className="tv-brand">
          <span>🏸</span>
          <span className="tv-brand-text">Badminton Live</span>
        </div>
        <div className="tv-header-center">
          <div className="tv-title">Live Scoreboard</div>
        </div>
        <div className="tv-header-right">
          <div className="tv-clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className={`tv-conn ${connected ? 'tv-conn-live' : 'tv-conn-off'}`}>
            <span className="tv-conn-dot" />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <Link to="/live" className="tv-exit-btn">⬅ Standard View</Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="tv-content">
        {loading && (
          <div className="tv-loading">
            <div className="tv-spinner" />
            <p>Connecting to live feed…</p>
          </div>
        )}

        {!loading && activeMatches.length === 0 && completedMatches.length === 0 && (
          <div className="tv-standby">
            <div className="tv-standby-shuttle">🏸</div>
            <div className="tv-standby-title">Standby</div>
            <div className="tv-standby-sub">Waiting for matches to begin…</div>
          </div>
        )}

        {!loading && activeMatches.length > 0 && (
          <div className={`tv-grid tv-grid-${Math.min(activeMatches.length, 3)}`}>
            {activeMatches.map((entry) => (
              <TvScorePanel key={entry.match.id} entry={entry} flashId={flashId} />
            ))}
          </div>
        )}

        {!loading && completedMatches.length > 0 && (
          <div className="tv-completed-strip">
            <span className="tv-completed-label">Recently Completed:</span>
            {completedMatches.slice(0, 4).map((entry) => {
              const sideALabel = entry.match.sideAName || 'TBD';
              const sideBLabel = entry.match.sideBName || 'TBD';
              const winner = entry.state.winner === 'A' ? sideALabel : sideBLabel;
              return (
                <span key={entry.match.id} className="tv-completed-item">
                  🏆 {winner} won on {entry.match.court?.name || '—'}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tv-page {
          min-height: 100vh;
          background: #050510;
          color: #fff;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── TV Header ── */
        .tv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          background: linear-gradient(90deg, #0f0c29, #1e1b4b);
          border-bottom: 2px solid rgba(167,139,250,0.3);
          flex-shrink: 0;
        }
        .tv-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.4rem;
        }
        .tv-brand-text {
          font-weight: 800;
          background: linear-gradient(90deg, #a78bfa, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tv-header-center { flex: 1; text-align: center; }
        .tv-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .tv-header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .tv-clock {
          font-size: 1.1rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: rgba(255,255,255,0.7);
        }
        .tv-conn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          background: rgba(255,255,255,0.06);
        }
        .tv-conn-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .tv-conn-live .tv-conn-dot {
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          animation: tvPulse 1.5s infinite;
        }
        .tv-conn-off .tv-conn-dot { background: #ef4444; }
        @keyframes tvPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .tv-exit-btn {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.15);
          padding: 0.3rem 0.75rem;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .tv-exit-btn:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.4);
        }

        /* ── Content ── */
        .tv-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          gap: 1rem;
          overflow: hidden;
        }

        /* ── Panel Grid ── */
        .tv-grid {
          flex: 1;
          display: grid;
          gap: 1.5rem;
          min-height: 0;
        }
        .tv-grid-1 { grid-template-columns: 1fr; }
        .tv-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .tv-grid-3 { grid-template-columns: repeat(3, 1fr); }

        /* ── TV Panel ── */
        .tv-panel {
          background: linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.3s;
        }
        .tv-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        .tv-panel.paused::after {
          background: linear-gradient(135deg, rgba(245,158,11,0.05) 0%, transparent 60%);
        }
        .tv-panel.flash {
          animation: panelFlash 0.7s ease;
        }
        @keyframes panelFlash {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          50% { box-shadow: 0 0 30px 8px rgba(239,68,68,0.3); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        /* Panel top bar */
        .tv-panel-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .tv-court-label {
          font-size: 1rem;
          font-weight: 800;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tv-category {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }
        .tv-round {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
        }
        .tv-live-chip {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #fca5a5;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
        }
        .tv-live-dot {
          width: 7px;
          height: 7px;
          background: #ef4444;
          border-radius: 50%;
          animation: tvPulse 1s infinite;
          box-shadow: 0 0 6px #ef4444;
        }
        .tv-paused-chip {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 700;
          color: #fde68a;
          background: rgba(245,158,11,0.15);
          border: 1px solid rgba(245,158,11,0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
        }
        .tv-done-chip {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 700;
          color: #86efac;
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
        }

        /* Score row */
        .tv-score-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }
        .tv-side {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 0;
        }
        .tv-side-a { flex-direction: row; }
        .tv-side-b { flex-direction: row-reverse; }
        .tv-winner .tv-player-name { color: #fbbf24; }

        .tv-player-names {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .tv-names-right { text-align: right; }
        .tv-player-name {
          font-size: clamp(1rem, 2.5vw, 1.6rem);
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #f1f5f9;
          line-height: 1.2;
        }

        .tv-score {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          color: rgba(255,255,255,0.3);
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.3s, text-shadow 0.3s;
        }
        .tv-score-leading {
          color: #fff;
          text-shadow: 0 0 30px rgba(167,139,250,0.6);
        }

        /* Center col */
        .tv-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          min-width: 120px;
        }
        .tv-set-scores {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          align-items: center;
        }
        .tv-set {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.9rem;
          font-variant-numeric: tabular-nums;
        }
        .tv-set-done { color: rgba(255,255,255,0.3); font-size: 0.8rem; }
        .tv-set-current { color: rgba(255,255,255,0.7); font-weight: 600; }
        .tv-set-winner { color: #fbbf24; font-weight: 700; }
        .tv-set-dash { color: rgba(255,255,255,0.2); }

        .tv-games-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tv-games-won {
          color: rgba(255,255,255,0.3);
          font-size: 1.2rem;
          font-variant-numeric: tabular-nums;
        }
        .tv-games-leader { color: #fbbf24; }
        .tv-games-label {
          color: rgba(255,255,255,0.2);
          font-size: 0.65rem;
        }

        .tv-winner-tag {
          margin-top: 0.25rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #fbbf24;
          text-align: center;
          background: rgba(251,191,36,0.1);
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          border: 1px solid rgba(251,191,36,0.3);
        }

        /* ── Completed strip ── */
        .tv-completed-strip {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 0.75rem 1.5rem;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 12px;
          font-size: 0.85rem;
          overflow-x: auto;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tv-completed-label {
          font-weight: 700;
          color: rgba(134,239,172,0.8);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.75rem;
          flex-shrink: 0;
        }
        .tv-completed-item {
          color: rgba(255,255,255,0.6);
          flex-shrink: 0;
        }

        /* ── Standby ── */
        .tv-standby {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .tv-standby-shuttle { font-size: 6rem; animation: floatShuttle 3s ease-in-out infinite; }
        @keyframes floatShuttle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        .tv-standby-title {
          font-size: 3rem;
          font-weight: 800;
          color: rgba(255,255,255,0.15);
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .tv-standby-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.2);
        }

        /* ── Loading ── */
        .tv-loading {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: rgba(255,255,255,0.4);
        }
        .tv-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: tvSpin 0.8s linear infinite;
        }
        @keyframes tvSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
