import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveMatches, LiveMatchEntry } from '../hooks/useLiveMatches';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function getStatusLabel(status: string) {
  switch (status) {
    case 'LIVE': return 'LIVE';
    case 'PAUSED': return 'PAUSED';
    case 'COMPLETED': return 'FINISHED';
    default: return status;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'LIVE': return 'live';
    case 'PAUSED': return 'paused';
    case 'COMPLETED': return 'completed';
    default: return 'default';
  }
}

// ─────────────────────────────────────────────────────────────
//  Score Card Component
// ─────────────────────────────────────────────────────────────

function ScoreCard({ entry, pulse }: { entry: LiveMatchEntry; pulse: boolean }) {
  const { match, state } = entry;
  const currentGame = state.games[state.currentGameNumber - 1] || state.games[0];
  const sideALabel = match.sideAName || 'TBD';
  const sideBLabel = match.sideBName || 'TBD';
  const statusClass = getStatusColor(match.status);
  const statusLabel = getStatusLabel(match.status);

  return (
    <div className={`score-card ${statusClass} ${pulse ? 'pulse' : ''}`}>
      {/* Header */}
      <div className="score-card-header">
        <div className="score-card-meta">
          <span className="court-badge">{match.court?.name || 'Court —'}</span>
          {match.category && (
            <span className="category-badge">{match.category.name}</span>
          )}
          {match.round && <span className="round-badge">{match.round}</span>}
        </div>
        <div className={`status-badge ${statusClass}`}>
          {statusClass === 'live' && <span className="live-dot" />}
          {statusLabel}
        </div>
      </div>

      {/* Score Board */}
      <div className="score-board">
        {/* Side A */}
        <div className={`side side-a ${state.winner === 'A' ? 'winner' : ''}`}>
          <div className="side-names">
          {sideALabel}
          </div>
          <div className="game-scores">
            {state.games.map((g, i) => (
              <div
                key={i}
                className={`game-score ${i === state.currentGameNumber - 1 && !state.isMatchComplete ? 'current-game' : ''}`}
              >
                {g.sideAPoints}
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider */}
        <div className="vs-divider">
          <span>vs</span>
          <div className="games-summary">
            <span className={`games-won ${state.sideAGamesWon > state.sideBGamesWon ? 'leading' : ''}`}>
              {state.sideAGamesWon}
            </span>
            <span className="games-dash">–</span>
            <span className={`games-won ${state.sideBGamesWon > state.sideAGamesWon ? 'leading' : ''}`}>
              {state.sideBGamesWon}
            </span>
          </div>
        </div>

        {/* Side B */}
        <div className={`side side-b ${state.winner === 'B' ? 'winner' : ''}`}>
          <div className="game-scores">
            {state.games.map((g, i) => (
              <div
                key={i}
                className={`game-score ${i === state.currentGameNumber - 1 && !state.isMatchComplete ? 'current-game' : ''}`}
              >
                {g.sideBPoints}
              </div>
            ))}
          </div>
          <div className="side-names align-right">
          {sideBLabel}
          </div>
        </div>
      </div>

      {/* Footer & Serving Status */}
      <div className="score-card-footer">
        {state.isMatchComplete && state.winner && (
          <span className="winner-label">
            🏆 {state.winner === 'A' ? sideALabel : sideBLabel} wins
          </span>
        )}
        {!state.isMatchComplete && currentGame && (
          <div className="flex flex-col gap-1">
            <span className="game-label">
              Game {state.currentGameNumber} · {currentGame.sideAPoints}–{currentGame.sideBPoints}
            </span>
            {state.servingState && match.status === 'LIVE' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.35rem', padding: '0.4rem 0.6rem', borderRadius: '8px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.75rem' }}>
                <span style={{ color: '#fef08a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🏸 {state.servingState.serverName} ({state.servingState.servingTeamName})
                </span>
                <span style={{ color: '#34d399', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(52,211,153,0.15)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Court: {state.servingState.serviceCourt}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Live Page
// ─────────────────────────────────────────────────────────────

export function LivePage() {
  const { matches, connected, loading, error } = useLiveMatches();
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  // Track which cards to pulse when score updates
  const handleScoreUpdate = (matchId: string) => {
    setPulsingIds((prev) => new Set(prev).add(matchId));
    setTimeout(() => {
      setPulsingIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }, 600);
  };

  // Pass pulse trigger down — since state is managed in hook, we pulse based on match updates
  // We'll simplify by not needing explicit pulse tracking (the CSS animation is on data-change)

  const inProgress = matches.filter((m) => m.match.status === 'LIVE');
  const paused = matches.filter((m) => m.match.status === 'PAUSED');
  const completed = matches.filter((m) => m.match.status === 'COMPLETED');

  return (
    <div className="live-page">
      {/* Navbar */}
      <nav className="live-nav">
        <Link to="/" className="live-nav-brand">
          <span className="brand-shuttle">🏸</span>
          <span>Badminton Live</span>
        </Link>
        <div className="live-nav-actions">
          <Link to="/tv" className="tv-link">📺 TV Mode</Link>
          <Link to="/fixtures" className="nav-link-secondary">Fixtures</Link>
          <Link to="/bracket" className="nav-link-secondary">Bracket</Link>
          <div className={`connection-indicator ${connected ? 'conn-online' : 'conn-offline'}`}>
            <span className="conn-dot" />
            {connected ? 'Live' : 'Reconnecting…'}
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <header className="live-header">
        <h1>Live Scores</h1>
        <p>Real-time updates · No refresh needed</p>
      </header>

      {/* Content */}
      <main className="live-main">
        {loading && (
          <div className="live-loading">
            <div className="spinner-large" />
            <p>Connecting to live scores…</p>
          </div>
        )}

        {error && !loading && (
          <div className="live-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="live-empty">
            <div className="empty-shuttle">🏸</div>
            <h2>No Live Matches</h2>
            <p>Matches will appear here when play begins.</p>
            <Link to="/fixtures" className="btn-primary">View Schedule</Link>
          </div>
        )}

        {!loading && inProgress.length > 0 && (
          <section className="live-section">
            <h2 className="section-heading">
              <span className="live-dot-large" />
              In Progress ({inProgress.length})
            </h2>
            <div className="score-grid">
              {inProgress.map((entry) => (
                <ScoreCard
                  key={entry.match.id}
                  entry={entry}
                  pulse={pulsingIds.has(entry.match.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && paused.length > 0 && (
          <section className="live-section">
            <h2 className="section-heading paused-heading">⏸ Paused ({paused.length})</h2>
            <div className="score-grid">
              {paused.map((entry) => (
                <ScoreCard
                  key={entry.match.id}
                  entry={entry}
                  pulse={false}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && completed.length > 0 && (
          <section className="live-section">
            <h2 className="section-heading completed-heading">✅ Recently Completed</h2>
            <div className="score-grid">
              {completed.map((entry) => (
                <ScoreCard
                  key={entry.match.id}
                  entry={entry}
                  pulse={false}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <style>{`
        .live-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Nav ── */
        .live-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .live-nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          text-decoration: none;
        }
        .brand-shuttle { font-size: 1.5rem; }
        .live-nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .tv-link {
          padding: 0.4rem 1rem;
          background: linear-gradient(135deg, #f59e0b, #f97316);
          color: #fff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          transition: opacity 0.2s;
        }
        .tv-link:hover { opacity: 0.85; }
        .nav-link-secondary {
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .nav-link-secondary:hover { color: #fff; }

        /* Connection indicator */
        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          background: rgba(255,255,255,0.08);
        }
        .conn-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .conn-online .conn-dot {
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: connPulse 2s infinite;
        }
        .conn-offline .conn-dot { background: #ef4444; }
        @keyframes connPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ── Header ── */
        .live-header {
          text-align: center;
          padding: 3rem 2rem 1.5rem;
        }
        .live-header h1 {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          background: linear-gradient(90deg, #fff 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 0.5rem;
        }
        .live-header p {
          color: rgba(255,255,255,0.5);
          font-size: 0.95rem;
        }

        /* ── Main ── */
        .live-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem 4rem;
        }

        /* ── Sections ── */
        .live-section { margin-bottom: 3rem; }
        .section-heading {
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.6);
          margin: 0 0 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .paused-heading { color: rgba(251,191,36,0.8); }
        .completed-heading { color: rgba(74,222,128,0.8); }
        .live-dot-large {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          animation: connPulse 1.2s infinite;
          box-shadow: 0 0 8px #ef4444;
        }

        /* ── Grid ── */
        .score-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        /* ── Score Card ── */
        .score-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 1.25rem;
          backdrop-filter: blur(10px);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .score-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #a78bfa, #6366f1);
        }
        .score-card.live::before {
          background: linear-gradient(90deg, #ef4444, #f97316);
        }
        .score-card.paused::before {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }
        .score-card.completed::before {
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }
        .score-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        .score-card.pulse {
          animation: scorePulse 0.5s ease;
        }
        @keyframes scorePulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        /* Card header */
        .score-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .score-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .court-badge, .category-badge, .round-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 100px;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .court-badge { background: rgba(99,102,241,0.25); color: #a5b4fc; }

        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.7rem;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .status-badge.live {
          background: rgba(239,68,68,0.2);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .status-badge.paused {
          background: rgba(245,158,11,0.2);
          color: #fde68a;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .status-badge.completed {
          background: rgba(34,197,94,0.2);
          color: #86efac;
          border: 1px solid rgba(34,197,94,0.3);
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          animation: connPulse 1s infinite;
        }

        /* Score board layout */
        .score-board {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .side {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .side-a { flex-direction: row; }
        .side-b { flex-direction: row-reverse; }
        .side.winner .player-name {
          color: #fbbf24;
        }

        .side-names {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }
        .side-names.align-right { text-align: right; }
        .player-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-scores {
          display: flex;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .game-score {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
        }
        .game-score.current-game {
          background: rgba(99,102,241,0.3);
          color: #fff;
          font-size: 1.3rem;
        }

        .vs-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
        }
        .vs-divider > span {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          font-weight: 600;
          text-transform: uppercase;
        }
        .games-summary {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .games-won { color: rgba(255,255,255,0.4); }
        .games-won.leading { color: #fbbf24; }
        .games-dash { color: rgba(255,255,255,0.2); }

        /* Card footer */
        .score-card-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 0.75rem;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.4);
        }
        .winner-label { color: #fbbf24; font-weight: 600; }
        .game-label { color: rgba(255,255,255,0.4); }

        /* ── Empty / Loading ── */
        .live-loading, .live-error, .live-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          gap: 1rem;
          text-align: center;
        }
        .spinner-large {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #a78bfa;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .live-empty .empty-shuttle { font-size: 4rem; margin-bottom: 0.5rem; }
        .live-empty h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
        .live-empty p { color: rgba(255,255,255,0.5); margin: 0; }
        .btn-primary {
          margin-top: 0.5rem;
          padding: 0.65rem 1.5rem;
          background: linear-gradient(135deg, #a78bfa, #6366f1);
          color: #fff;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .btn-primary:hover { opacity: 0.85; }
        .live-error span { font-size: 2rem; }
        .live-error p { color: #fca5a5; }

        @media (max-width: 768px) {
          .live-nav { padding: 0 1rem; height: auto; min-height: 56px; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .live-nav-actions { gap: 0.5rem; flex-wrap: wrap; }
          .nav-link-secondary { display: none; }
        }

        @media (max-width: 640px) {
          .live-header { padding: 1.75rem 1rem 0.75rem; }
          .live-main { padding: 0.75rem 0.875rem 3rem; }
          .score-grid { grid-template-columns: 1fr; }
          .score-card { padding: 0.875rem 1rem; }
          .score-board { gap: 0.5rem; }
          .side { gap: 0.4rem; }
          .player-name {
            font-size: 0.8rem;
            white-space: normal;
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }
          .game-score { width: 32px; height: 32px; font-size: 1rem; }
          .game-score.current-game { font-size: 1.15rem; }
        }
      `}</style>
    </div>
  );
}
