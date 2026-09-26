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

  const sideAScore = currentGame?.sideAPoints ?? 0;
  const sideBScore = currentGame?.sideBPoints ?? 0;
  const sideALeading = sideAScore > sideBScore;
  const sideBLeading = sideBScore > sideAScore;

  return (
    <div className={`score-card ${statusClass} ${pulse ? 'pulse' : ''}`}>
      {/* Card Header */}
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

      {/* Main Score Board */}
      <div className="score-board">
        {/* Side A */}
        <div className={`side side-a ${state.winner === 'A' ? 'winner' : ''}`}>
          <div className="side-names align-right">
            <span className="player-name">{sideALabel}</span>
          </div>
          <div className={`main-pts ${sideALeading ? 'leading' : ''}`}>
            {sideAScore}
          </div>
        </div>

        {/* Center Divider */}
        <div className="vs-divider">
          <div className="games-summary">
            <span className={`games-won ${state.sideAGamesWon > state.sideBGamesWon ? 'leading' : ''}`}>
              {state.sideAGamesWon}
            </span>
            <span className="games-dash">–</span>
            <span className={`games-won ${state.sideBGamesWon > state.sideAGamesWon ? 'leading' : ''}`}>
              {state.sideBGamesWon}
            </span>
          </div>
          <span className="sets-label">SETS</span>
          {!state.isMatchComplete && (
            <span className="current-game-tag">Game {state.currentGameNumber}</span>
          )}
        </div>

        {/* Side B */}
        <div className={`side side-b ${state.winner === 'B' ? 'winner' : ''}`}>
          <div className={`main-pts ${sideBLeading ? 'leading' : ''}`}>
            {sideBScore}
          </div>
          <div className="side-names align-left">
            <span className="player-name">{sideBLabel}</span>
          </div>
        </div>
      </div>

      {/* Sets Breakdown Strip */}
      {state.games && state.games.length > 0 && (
        <div className="sets-breakdown">
          {state.games.map((g, i) => (
            <div
              key={i}
              className={`set-pill ${i === state.currentGameNumber - 1 && !state.isMatchComplete ? 'active' : ''}`}
            >
              <span className="set-num">G{g.gameNumber}:</span>
              <span className={g.winner === 'A' || g.sideAPoints > g.sideBPoints ? 'pts-win' : ''}>{g.sideAPoints}</span>
              <span className="set-dash">-</span>
              <span className={g.winner === 'B' || g.sideBPoints > g.sideAPoints ? 'pts-win' : ''}>{g.sideBPoints}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer & Serving Status */}
      <div className="score-card-footer">
        {state.isMatchComplete && state.winner && (
          <div className="winner-banner">
            🏆 <strong>{state.winner === 'A' ? sideALabel : sideBLabel}</strong> wins the match!
          </div>
        )}
        {!state.isMatchComplete && state.servingState && match.status === 'LIVE' && (
          <div className="serving-strip">
            <div className="server-info">
              <span className="shuttle-icon">🏸</span>
              <span className="server-text">
                <strong>SERVER:</strong> {state.servingState.serverName} ({state.servingState.servingTeamName})
              </span>
            </div>
            <div className="court-info">
              <span className="court-label">COURT:</span>
              <span className="court-value">{state.servingState.serviceCourt}</span>
            </div>
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
  const [pulsingIds] = useState<Set<string>>(new Set());

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

        /* ── Main Container ── */
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
          grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
          gap: 1.5rem;
          align-items: stretch;
        }

        /* ── Score Card ── */
        .score-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 1.35rem 1.5rem;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
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
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(167, 139, 250, 0.12);
        }
        .score-card.pulse {
          animation: scorePulse 0.5s ease;
        }
        @keyframes scorePulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        /* ── Header ── */
        .score-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          gap: 0.5rem;
        }
        .score-card-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
        }
        .court-badge, .category-badge, .round-badge {
          font-size: 0.725rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .court-badge {
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #c7d2fe;
        }
        .category-badge {
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.3);
          color: #e9d5ff;
        }
        .round-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);
        }
        .status-badge {
          font-size: 0.725rem;
          font-weight: 800;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .status-badge.live {
          background: rgba(239, 68, 68, 0.18);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.35);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
        }
        .status-badge.paused {
          background: rgba(245, 158, 11, 0.18);
          color: #fde68a;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .status-badge.completed {
          background: rgba(34, 197, 94, 0.18);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.35);
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          animation: connPulse 1s infinite;
        }

        /* ── Main Score Board ── */
        .score-board {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .side {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
        }
        .side-a { flex-direction: row; justify-content: flex-end; }
        .side-b { flex-direction: row; justify-content: flex-start; }

        .side-names {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }
        .side-names.align-right { text-align: right; }
        .side-names.align-left { text-align: left; }
        .player-name {
          font-size: clamp(0.95rem, 1.8vw, 1.15rem);
          font-weight: 700;
          color: #f8fafc;
          line-height: 1.25;
          word-break: break-word;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .side.winner .player-name {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
        }

        .main-pts {
          font-size: clamp(2.25rem, 4.5vw, 3.25rem);
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          color: rgba(255, 255, 255, 0.35);
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .main-pts.leading {
          color: #ffffff;
          text-shadow: 0 0 24px rgba(167, 139, 250, 0.5);
        }

        /* Center Divider */
        .vs-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.15rem;
          flex-shrink: 0;
          padding: 0 0.25rem;
          min-width: 70px;
        }
        .games-summary {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 1.15rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .games-won { color: rgba(255, 255, 255, 0.4); }
        .games-won.leading { color: #fbbf24; }
        .games-dash { color: rgba(255, 255, 255, 0.2); }
        .sets-label {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
        }
        .current-game-tag {
          font-size: 0.675rem;
          font-weight: 700;
          color: #a78bfa;
          background: rgba(167, 139, 250, 0.15);
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
          margin-top: 0.2rem;
          white-space: nowrap;
        }

        /* ── Sets Breakdown Strip ── */
        .sets-breakdown {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .set-pill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.775rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.45);
        }
        .set-pill.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
          color: #c7d2fe;
        }
        .set-num { font-size: 0.7rem; color: rgba(255, 255, 255, 0.35); font-weight: 700; }
        .set-dash { color: rgba(255, 255, 255, 0.2); }
        .pts-win { color: #fbbf24; font-weight: 700; }

        /* ── Serving & Footer Strip ── */
        .score-card-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 0.85rem;
        }
        .winner-banner {
          font-size: 0.875rem;
          color: #fbbf24;
          text-align: center;
          font-weight: 600;
          padding: 0.4rem;
          background: rgba(251, 191, 36, 0.08);
          border-radius: 8px;
          border: 1px solid rgba(251, 191, 36, 0.2);
        }
        .serving-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.28);
          font-size: 0.8rem;
          flex-wrap: wrap;
        }
        .server-info {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          min-width: 0;
          flex: 1;
        }
        .shuttle-icon { font-size: 0.9rem; flex-shrink: 0; }
        .server-text {
          color: #fef08a;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .court-info {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
          background: rgba(52, 211, 153, 0.15);
          border: 1px solid rgba(52, 211, 153, 0.3);
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .court-label {
          font-size: 0.675rem;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 700;
          text-transform: uppercase;
        }
        .court-value {
          font-size: 0.775rem;
          color: #34d399;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

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
          .score-grid {
            grid-template-columns: 1fr;
          }
          .score-card {
            padding: 1.1rem 1.15rem;
          }
        }

        @media (max-width: 480px) {
          .live-header { padding: 1.75rem 1rem 0.75rem; }
          .live-main { padding: 0.75rem 0.875rem 3rem; }
          .score-card {
            padding: 1rem;
            border-radius: 16px;
          }
          .score-board {
            gap: 0.5rem;
          }
          .side {
            gap: 0.4rem;
          }
          .player-name {
            font-size: 0.85rem;
          }
          .main-pts {
            font-size: 2rem;
          }
          .vs-divider {
            min-width: 54px;
            padding: 0 0.1rem;
          }
          .games-summary {
            font-size: 1rem;
          }
          .serving-strip {
            padding: 0.45rem 0.6rem;
            gap: 0.4rem;
            flex-direction: column;
            align-items: flex-start;
          }
          .server-info {
            width: 100%;
          }
          .server-text {
            white-space: normal;
            word-break: break-word;
          }
          .court-info {
            align-self: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

