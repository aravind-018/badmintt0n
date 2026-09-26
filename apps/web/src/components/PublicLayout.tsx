import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
//  Status Badge — consistent across all public pages
// ─────────────────────────────────────────────────────────────

export type MatchStatus =
  | 'LIVE'
  | 'PAUSED'
  | 'SCHEDULED'
  | 'CALLED'
  | 'READY'
  | 'COMPLETED'
  | 'WALKOVER'
  | 'RETIRED'
  | 'POSTPONED'
  | 'CANCELLED';

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: boolean; bg: string; text: string; border: string }
> = {
  LIVE:      { label: 'LIVE',      dot: true,  bg: 'rgba(239,68,68,0.15)',    text: '#fca5a5', border: 'rgba(239,68,68,0.35)'    },
  PAUSED:    { label: 'PAUSED',    dot: false, bg: 'rgba(245,158,11,0.15)',   text: '#fde68a', border: 'rgba(245,158,11,0.35)'   },
  SCHEDULED: { label: 'UPCOMING',  dot: false, bg: 'rgba(99,102,241,0.15)',   text: '#a5b4fc', border: 'rgba(99,102,241,0.35)'   },
  CALLED:    { label: 'CALLED',    dot: false, bg: 'rgba(99,102,241,0.15)',   text: '#a5b4fc', border: 'rgba(99,102,241,0.35)'   },
  READY:     { label: 'READY',     dot: true,  bg: 'rgba(34,197,94,0.12)',    text: '#86efac', border: 'rgba(34,197,94,0.3)'     },
  COMPLETED: { label: 'COMPLETED', dot: false, bg: 'rgba(100,116,139,0.15)',  text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
  WALKOVER:  { label: 'WALKOVER',  dot: false, bg: 'rgba(100,116,139,0.15)',  text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
  RETIRED:   { label: 'RETIRED',   dot: false, bg: 'rgba(100,116,139,0.15)',  text: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
  POSTPONED: { label: 'POSTPONED', dot: false, bg: 'rgba(251,191,36,0.12)',   text: '#fcd34d', border: 'rgba(251,191,36,0.3)'   },
  CANCELLED: { label: 'CANCELLED', dot: false, bg: 'rgba(239,68,68,0.1)',     text: '#fca5a5', border: 'rgba(239,68,68,0.2)'    },
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SCHEDULED;
  const padding = size === 'md' ? '0.35rem 0.9rem' : '0.2rem 0.65rem';
  const fontSize = size === 'md' ? '0.8rem' : '0.7rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding,
        borderRadius: '100px',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.05em',
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: cfg.text,
            display: 'inline-block',
            animation: 'pubPulse 1.2s infinite',
          }}
        />
      )}
      {cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
//  Score Display
// ─────────────────────────────────────────────────────────────

export const GameScore: React.FC<{
  sideAPoints: number;
  sideBPoints: number;
  isCurrent?: boolean;
  sideAWon?: boolean;
  sideBWon?: boolean;
}> = ({ sideAPoints, sideBPoints, isCurrent, sideAWon, sideBWon }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    <span
      style={{
        fontSize: isCurrent ? '1.5rem' : '1rem',
        fontWeight: 800,
        color: sideAWon ? '#fbbf24' : isCurrent ? '#fff' : 'rgba(255,255,255,0.45)',
        minWidth: '1.5ch',
        textAlign: 'right',
      }}
    >
      {sideAPoints}
    </span>
    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: isCurrent ? '1.2rem' : '0.85rem' }}>–</span>
    <span
      style={{
        fontSize: isCurrent ? '1.5rem' : '1rem',
        fontWeight: 800,
        color: sideBWon ? '#fbbf24' : isCurrent ? '#fff' : 'rgba(255,255,255,0.45)',
        minWidth: '1.5ch',
      }}
    >
      {sideBPoints}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────
//  Navigation
// ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { path: '/',          label: 'Home'     },
  { path: '/live',      label: 'Live',    live: true },
  { path: '/fixtures',  label: 'Fixtures' },
  { path: '/results',   label: 'Results'  },
  { path: '/standings', label: 'Standings'},
  { path: '/teams',     label: 'Teams'    },
  { path: '/players',   label: 'Players'  },
  { path: '/bracket',   label: 'Bracket'  },
];

export const PublicNav: React.FC<{ liveCount?: number }> = ({ liveCount = 0 }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <nav className="pub-nav">
      <div className="pub-nav-inner">
        {/* Brand */}
        <Link to="/" className="pub-brand" onClick={() => setMenuOpen(false)}>
          <span className="pub-brand-icon">🏸</span>
          <span className="pub-brand-text">Badminton Live</span>
        </Link>

        {/* Desktop links */}
        <div className="pub-nav-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`pub-nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
              {link.live && liveCount > 0 && (
                <span className="live-count-badge">{liveCount}</span>
              )}
            </Link>
          ))}
          <Link to="/tv" className="tv-pill">📺 TV</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="pub-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="pub-mobile-menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`pub-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
              {link.live && liveCount > 0 && (
                <span className="live-count-badge">{liveCount}</span>
              )}
            </Link>
          ))}
          <Link to="/tv" className="pub-mobile-link" onClick={() => setMenuOpen(false)}>
            📺 TV Mode
          </Link>
        </div>
      )}

      <style>{`
        @keyframes pubPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .pub-nav {
          position: sticky;
          top: 0;
          z-index: 200;
          background: rgba(10, 10, 26, 0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .pub-nav-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1.25rem;
          height: 60px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .pub-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          flex-shrink: 0;
        }
        .pub-brand-icon { font-size: 1.4rem; }
        .pub-brand-text {
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.01em;
        }
        .pub-nav-links {
          display: flex;
          align-items: center;
          gap: 0.15rem;
          margin-left: auto;
        }
        .pub-nav-link {
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          white-space: nowrap;
        }
        .pub-nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .pub-nav-link.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 600; }
        .live-count-badge {
          background: #ef4444;
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.05rem 0.4rem;
          border-radius: 100px;
          animation: pubPulse 1.5s infinite;
          min-width: 1.2em;
          text-align: center;
        }
        .tv-pill {
          padding: 0.35rem 0.85rem;
          background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2));
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fbbf24;
          text-decoration: none;
          transition: opacity 0.15s;
          white-space: nowrap;
          margin-left: 0.5rem;
        }
        .tv-pill:hover { opacity: 0.8; }

        /* Mobile hamburger */
        .pub-menu-btn {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          min-width: 44px;
          min-height: 44px;
          padding: 0.5rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          cursor: pointer;
          margin-left: auto;
          transition: background 0.15s;
        }
        .pub-menu-btn:hover { background: rgba(255,255,255,0.1); }
        .pub-menu-btn span {
          display: block;
          width: 22px;
          height: 2px;
          background: rgba(255,255,255,0.85);
          border-radius: 2px;
          transition: transform 0.2s, opacity 0.2s;
        }

        /* Mobile menu */
        .pub-mobile-menu {
          display: flex;
          flex-direction: column;
          background: rgba(10,10,26,0.98);
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 0.75rem 1rem 1.25rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .pub-mobile-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 0.75rem;
          font-size: 1rem;
          font-weight: 500;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          min-height: 44px;
        }
        .pub-mobile-link:last-child { border-bottom: none; }
        .pub-mobile-link:hover, .pub-mobile-link.active {
          color: #fff;
          background: rgba(255,255,255,0.08);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .pub-nav-links { display: none; }
          .pub-menu-btn { display: flex; }
        }
      `}</style>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────
//  Page Shell — wraps all public pages
// ─────────────────────────────────────────────────────────────

export const PublicLayout: React.FC<{
  children: React.ReactNode;
  liveCount?: number;
}> = ({ children, liveCount }) => (
  <div className="pub-shell">
    <PublicNav liveCount={liveCount} />
    <main className="pub-main">{children}</main>
    <footer className="pub-footer">
      <div className="pub-footer-inner">
        <span>🏸 Badminton Live</span>
        <span>Real-time tournament scoring platform</span>
        <div className="pub-footer-links">
          <Link to="/live">Live</Link>
          <Link to="/fixtures">Fixtures</Link>
          <Link to="/results">Results</Link>
          <Link to="/tv">TV Mode</Link>
        </div>
      </div>
    </footer>

    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      html { scroll-behavior: smooth; overflow-x: hidden; }
      .pub-shell {
        min-height: 100vh;
        background: #0a0a1a;
        color: #e2e8f0;
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
        width: 100%;
      }
      .pub-main { flex: 1; width: 100%; overflow-x: hidden; }
      .pub-footer {
        border-top: 1px solid rgba(255,255,255,0.06);
        padding: 1.5rem 1.25rem;
        margin-top: 3rem;
        width: 100%;
      }
      .pub-footer-inner {
        max-width: 1280px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        font-size: 0.8rem;
        color: rgba(255,255,255,0.3);
      }
      .pub-footer-links {
        margin-left: auto;
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .pub-footer-links a {
        color: rgba(255,255,255,0.4);
        text-decoration: none;
        transition: color 0.15s;
        min-height: 36px;
        display: inline-flex;
        align-items: center;
      }
      .pub-footer-links a:hover { color: rgba(255,255,255,0.8); }

      /* Shared utility classes */
      .pub-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 1.25rem;
        width: 100%;
      }
      .pub-page-header {
        padding: 2.25rem 0 1.25rem;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 1.75rem;
      }
      .pub-page-title {
        font-size: clamp(1.35rem, 4.5vw, 2.25rem);
        font-weight: 800;
        color: #fff;
        margin: 0 0 0.35rem;
        letter-spacing: -0.02em;
        word-break: break-word;
      }
      .pub-page-subtitle {
        font-size: clamp(0.8rem, 2.5vw, 0.95rem);
        color: rgba(255,255,255,0.45);
        margin: 0;
      }

      /* Card base */
      .pub-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        overflow: hidden;
        transition: border-color 0.2s, transform 0.15s;
      }
      .pub-card:hover { border-color: rgba(255,255,255,0.14); }

      /* Filter bar */
      .pub-filter-bar {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
        align-items: center;
      }
      .pub-filter-input {
        padding: 0.55rem 0.9rem;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #e2e8f0;
        font-size: 0.875rem;
        outline: none;
        transition: border-color 0.15s;
        min-width: 0;
      }
      .pub-filter-input:focus { border-color: rgba(99,102,241,0.5); }
      .pub-filter-input::placeholder { color: rgba(255,255,255,0.3); }
      .pub-filter-select {
        padding: 0.55rem 0.9rem;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #e2e8f0;
        font-size: 0.875rem;
        outline: none;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .pub-filter-select:focus { border-color: rgba(99,102,241,0.5); }
      .pub-filter-select option { background: #1e1e30; }

      /* Loading spinner */
      .pub-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(255,255,255,0.08);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: pubSpin 0.75s linear infinite;
      }
      @keyframes pubSpin { to { transform: rotate(360deg); } }

      .pub-loading, .pub-empty, .pub-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 5rem 1rem;
        gap: 1rem;
        text-align: center;
      }
      .pub-empty-icon { font-size: 3rem; }
      .pub-empty h3 { font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0; }
      .pub-empty p { color: rgba(255,255,255,0.4); margin: 0; font-size: 0.9rem; }

      /* Match row used in Fixtures + Results */
      .match-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        transition: background 0.15s;
        text-decoration: none;
        color: inherit;
      }
      .match-row:last-child { border-bottom: none; }
      .match-row:hover { background: rgba(255,255,255,0.04); }

      .match-side-a {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.1rem;
        min-width: 0;
      }
      .match-side-b {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.1rem;
        min-width: 0;
      }
      .match-player-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .match-player-name.winner { color: #fbbf24; }
      .match-player-name.loser { color: rgba(255,255,255,0.4); }
      .match-center {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        flex-shrink: 0;
      }
      .match-meta {
        font-size: 0.7rem;
        color: rgba(255,255,255,0.35);
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        margin-top: 0.25rem;
      }

      /* Section heading */
      .pub-section-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255,255,255,0.4);
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }

      @media (max-width: 640px) {
        .pub-container { padding: 0 0.875rem; }
        .pub-page-header { padding: 1.75rem 0 1rem; }
        .match-row { padding: 0.875rem 1rem; grid-template-columns: 1fr auto 1fr; gap: 0.5rem; }
        .match-player-name { font-size: 0.85rem; }
        .pub-filter-bar { gap: 0.5rem; }
        .pub-filter-input, .pub-filter-select { font-size: 0.8rem; padding: 0.45rem 0.7rem; }
      }
    `}</style>
  </div>
);

// ─────────────────────────────────────────────────────────────
//  Utility helpers
// ─────────────────────────────────────────────────────────────

export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isLive(status: string) {
  return status === 'LIVE' || status === 'PAUSED';
}
export function isComplete(status: string) {
  return ['COMPLETED', 'WALKOVER', 'RETIRED'].includes(status);
}
export function isUpcoming(status: string) {
  return ['SCHEDULED', 'CALLED', 'READY'].includes(status);
}
