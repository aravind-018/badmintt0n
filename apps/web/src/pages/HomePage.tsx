import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout, StatusBadge, GameScore, formatDateTime, formatTime, isLive, isComplete } from '../components/PublicLayout';
import { useLiveMatches } from '../hooks/useLiveMatches';

// ─────────────────────────────────────────────────────────────
//  Live Score Card (compact for home page)
// ─────────────────────────────────────────────────────────────

function LiveMatchCard({ entry }: { entry: any }) {
  const { match, state } = entry;
  const currentGame = state?.games?.[state.currentGameNumber - 1] || state?.games?.[0];

  return (
    <Link to={`/match/${match.id}`} className="home-live-card">
      <div className="hlc-header">
        <span className="hlc-court">{match.court?.name || '—'}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="hlc-score">
        <div className="hlc-side hlc-side-a">
          <span className={`hlc-name ${state?.winner === 'A' ? 'winner' : ''}`}>
            {match.sideAName || 'TBD'}
          </span>
          <span className={`hlc-pts ${(currentGame?.sideAPoints ?? 0) > (currentGame?.sideBPoints ?? 0) ? 'leading' : ''}`}>
            {currentGame?.sideAPoints ?? 0}
          </span>
        </div>
        <div className="hlc-divider">
          <span className="hlc-set-info">
            {state?.sideAGamesWon ?? 0}–{state?.sideBGamesWon ?? 0}
          </span>
          <span className="hlc-g-label">sets</span>
        </div>
        <div className="hlc-side hlc-side-b">
          <span className={`hlc-pts ${(currentGame?.sideBPoints ?? 0) > (currentGame?.sideAPoints ?? 0) ? 'leading' : ''}`}>
            {currentGame?.sideBPoints ?? 0}
          </span>
          <span className={`hlc-name ${state?.winner === 'B' ? 'winner' : ''}`}>
            {match.sideBName || 'TBD'}
          </span>
        </div>
      </div>
      {match.category && (
        <div className="hlc-footer">{match.category.name}</div>
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
//  Upcoming Match Row
// ─────────────────────────────────────────────────────────────

function UpcomingRow({ match }: { match: any }) {
  return (
    <Link to={`/match/${match.id}`} className="upcoming-row">
      <div className="upcoming-time">
        <span>{formatTime(match.scheduledAt)}</span>
        {match.court && <span className="upcoming-court">{match.court.name}</span>}
      </div>
      <div className="upcoming-participants">
        <span>{match.sideAName || 'TBD'}</span>
        <span className="upcoming-vs">vs</span>
        <span>{match.sideBName || 'TBD'}</span>
      </div>
      <div className="upcoming-meta">
        {match.category && <span>{match.category.name}</span>}
        <StatusBadge status={match.status} />
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
//  Result Row
// ─────────────────────────────────────────────────────────────

function ResultRow({ match }: { match: any }) {
  const sideAWon = match.winnerId === match.sideAId;
  const sideBWon = match.winnerId === match.sideBId;

  return (
    <Link to={`/match/${match.id}`} className="result-row">
      <div className="result-side result-side-a">
        <span className={`result-name ${sideAWon ? 'winner' : sideBWon ? 'loser' : ''}`}>
          {match.sideAName || 'TBD'}
        </span>
      </div>
      <div className="result-center">
        <div className="result-scores">
          {(match.games || []).map((g: any) => (
            <GameScore
              key={g.gameNumber}
              sideAPoints={g.sideAPoints}
              sideBPoints={g.sideBPoints}
              sideAWon={sideAWon}
              sideBWon={sideBWon}
            />
          ))}
        </div>
        <StatusBadge status={match.status} />
      </div>
      <div className="result-side result-side-b">
        <span className={`result-name ${sideBWon ? 'winner' : sideAWon ? 'loser' : ''}`}>
          {match.sideBName || 'TBD'}
        </span>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
//  Tournament Card
// ─────────────────────────────────────────────────────────────

function TournamentCard({ t }: { t: any }) {
  return (
    <Link to={`/tournament/${t.slug}`} className="tournament-card">
      <div className="tc-icon">🏆</div>
      <div className="tc-info">
        <div className="tc-name">{t.name}</div>
        {t.venue && <div className="tc-venue">📍 {t.venue}</div>}
        <div className="tc-counts">
          <span>{t._count?.matches || 0} matches</span>
          <span>{t._count?.teams || 0} teams</span>
          <span>{t._count?.categories || 0} categories</span>
        </div>
      </div>
      <StatusBadge status={t.status} />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
//  Home Page
// ─────────────────────────────────────────────────────────────

export const HomePage: React.FC = () => {
  const { matches: liveMatches, connected, loading: liveLoading } = useLiveMatches();
  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/public/home');
      if (res.ok) {
        const data = await res.json();
        setHomeData(data);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
    // Refresh home data every 30s for upcoming/results sections
    const id = setInterval(fetchHomeData, 30000);
    return () => clearInterval(id);
  }, [fetchHomeData]);

  const upcoming = homeData?.upcomingMatches || [];
  const results = homeData?.recentResults || [];
  const tournaments = homeData?.tournaments || [];

  return (
    <PublicLayout liveCount={liveMatches.filter(m => m.match.status === 'LIVE').length}>
      {/* Hero */}
      <div className="home-hero">
        <div className="pub-container">
          <div className="home-hero-inner">
            <div className="home-hero-text">
              <div className="home-hero-eyebrow">🏸 Live Tournament</div>
              <h1 className="home-hero-title">Badminton Live</h1>
              <p className="home-hero-sub">
                Real-time scores · Fixtures · Standings · Results
              </p>
              <div className="home-hero-actions">
                <Link to="/live" className="home-cta-primary">
                  {liveMatches.filter(m=>m.match.status==='LIVE').length > 0
                    ? `Watch Live (${liveMatches.filter(m=>m.match.status==='LIVE').length} active)`
                    : 'Live Scoreboard'}
                </Link>
                <Link to="/fixtures" className="home-cta-secondary">View Fixtures</Link>
              </div>
            </div>
            <div className="home-hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-val">{liveMatches.filter(m=>m.match.status==='LIVE').length}</span>
                <span className="hero-stat-label">Live Now</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-val">{upcoming.length}</span>
                <span className="hero-stat-label">Upcoming</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-val">{results.length}</span>
                <span className="hero-stat-label">Results Today</span>
              </div>
              <div className={`hero-conn ${connected ? 'online' : 'offline'}`}>
                <span className="hero-conn-dot" />
                {connected ? 'Live' : 'Connecting'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pub-container home-body">
        {/* Published Announcements Banner */}
        {homeData?.announcements && homeData.announcements.length > 0 && (
          <section className="home-section" style={{ marginBottom: '1.5rem' }}>
            <div className="pub-card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📢</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Official Announcements</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {homeData.announcements.map((a: any) => (
                  <div key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>{a.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        {/* Live Now section */}
        {!liveLoading && liveMatches.length > 0 && (
          <section className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">
                <span className="live-indicator" />
                Live Now
              </h2>
              <Link to="/live" className="home-section-more">All courts →</Link>
            </div>
            <div className="home-live-grid">
              {liveMatches.slice(0, 4).map((entry) => (
                <LiveMatchCard key={entry.match.id} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {liveMatches.length === 0 && !liveLoading && (
          <section className="home-section">
            <div className="home-no-live">
              <span>🏸</span>
              <p>No matches currently live. Check the <Link to="/fixtures">fixtures</Link> for upcoming matches.</p>
            </div>
          </section>
        )}

        <div className="home-two-col">
          {/* Upcoming */}
          <section className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">Upcoming</h2>
              <Link to="/fixtures" className="home-section-more">Full schedule →</Link>
            </div>
            <div className="pub-card">
              {loading && <div className="pub-loading"><div className="pub-spinner" /></div>}
              {!loading && upcoming.length === 0 && (
                <div className="pub-empty" style={{ padding: '2rem' }}>
                  <div className="pub-empty-icon">📅</div>
                  <h3>No upcoming matches</h3>
                </div>
              )}
              {upcoming.map((m: any) => <UpcomingRow key={m.id} match={m} />)}
            </div>
          </section>

          {/* Recent Results */}
          <section className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">Recent Results</h2>
              <Link to="/results" className="home-section-more">All results →</Link>
            </div>
            <div className="pub-card">
              {loading && <div className="pub-loading"><div className="pub-spinner" /></div>}
              {!loading && results.length === 0 && (
                <div className="pub-empty" style={{ padding: '2rem' }}>
                  <div className="pub-empty-icon">🏁</div>
                  <h3>No results yet</h3>
                </div>
              )}
              {results.map((m: any) => <ResultRow key={m.id} match={m} />)}
            </div>
          </section>
        </div>

        {/* Tournaments */}
        {tournaments.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title">Tournaments</h2>
            <div className="tournaments-grid">
              {tournaments.slice(0, 6).map((t: any) => (
                <TournamentCard key={t.id} t={t} />
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        /* ── Hero ── */
        .home-hero {
          background: linear-gradient(135deg, #0f0c29 0%, #1a1640 50%, #0a0a1a 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 3.5rem 0;
        }
        .home-hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .home-hero-eyebrow {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(167,139,250,0.8);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }
        .home-hero-title {
          font-size: clamp(2.25rem, 6vw, 3.5rem);
          font-weight: 900;
          color: #fff;
          margin: 0 0 0.75rem;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .home-hero-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.5);
          margin: 0 0 1.75rem;
        }
        .home-hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .home-cta-primary {
          padding: 0.7rem 1.5rem;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          border-radius: 12px;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .home-cta-primary:hover { opacity: 0.85; }
        .home-cta-secondary {
          padding: 0.7rem 1.5rem;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 12px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .home-cta-secondary:hover { background: rgba(255,255,255,0.12); }

        /* Hero stats */
        .home-hero-stats {
          display: flex;
          gap: 1.5rem;
          flex-shrink: 0;
          align-items: center;
          flex-wrap: wrap;
        }
        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }
        .hero-stat-val {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .hero-stat-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .hero-conn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.3rem 0.8rem;
          border-radius: 100px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
        }
        .hero-conn-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
        .hero-conn.online .hero-conn-dot { background: #22c55e; animation: pubPulse 1.5s infinite; box-shadow: 0 0 6px #22c55e; }
        .hero-conn.online { color: rgba(255,255,255,0.7); }

        /* ── Body ── */
        .home-body { padding-top: 2.5rem; padding-bottom: 3rem; }
        .home-section { margin-bottom: 2.5rem; }
        .home-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .home-section-title {
          font-size: 1rem;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .live-indicator {
          width: 9px;
          height: 9px;
          background: #ef4444;
          border-radius: 50%;
          animation: pubPulse 1s infinite;
          box-shadow: 0 0 6px #ef4444;
        }
        .home-section-more {
          font-size: 0.8rem;
          color: rgba(99,102,241,0.85);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .home-section-more:hover { color: #a5b4fc; }

        /* Live grid */
        .home-live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .home-live-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 14px;
          padding: 1rem;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, transform 0.15s;
          display: block;
        }
        .home-live-card:hover {
          border-color: rgba(239,68,68,0.4);
          transform: translateY(-2px);
        }
        .hlc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.875rem;
        }
        .hlc-court {
          font-size: 0.75rem;
          font-weight: 700;
          color: #a5b4fc;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .hlc-score {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .hlc-side {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }
        .hlc-side-a {
          justify-content: flex-end;
        }
        .hlc-side-b {
          justify-content: flex-start;
        }
        .hlc-side-a .hlc-name {
          text-align: right;
        }
        .hlc-side-b .hlc-name {
          text-align: left;
        }
        .hlc-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .hlc-name.winner { color: #fbbf24; }
        .hlc-pts {
          font-size: 1.75rem;
          font-weight: 900;
          color: rgba(255,255,255,0.35);
          font-variant-numeric: tabular-nums;
          line-height: 1;
          flex-shrink: 0;
        }
        .hlc-pts.leading { color: #fff; }
        .hlc-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.1rem;
          flex-shrink: 0;
        }
        .hlc-set-info { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .hlc-g-label { font-size: 0.65rem; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.06em; }
        .hlc-footer { font-size: 0.7rem; color: rgba(255,255,255,0.3); }

        /* No live */
        .home-no-live {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          color: rgba(255,255,255,0.4);
          font-size: 0.9rem;
        }
        .home-no-live span { font-size: 1.5rem; flex-shrink: 0; }
        .home-no-live a { color: #a5b4fc; text-decoration: none; }
        .home-no-live a:hover { text-decoration: underline; }

        /* Two-col layout */
        .home-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        /* Upcoming row */
        .upcoming-row {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.125rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }
        .upcoming-row:last-child { border-bottom: none; }
        .upcoming-row:hover { background: rgba(255,255,255,0.04); }
        .upcoming-time {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #a5b4fc;
        }
        .upcoming-court { font-weight: 500; color: rgba(255,255,255,0.35); font-size: 0.7rem; }
        .upcoming-participants {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #e2e8f0;
          min-width: 0;
        }
        .upcoming-vs { font-size: 0.7rem; color: rgba(255,255,255,0.25); }
        .upcoming-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.3rem;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.35);
          flex-shrink: 0;
        }

        /* Result row */
        .result-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.125rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }
        .result-row:last-child { border-bottom: none; }
        .result-row:hover { background: rgba(255,255,255,0.04); }
        .result-side { min-width: 0; }
        .result-side-a { text-align: right; }
        .result-side-b { text-align: left; }
        .result-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #e2e8f0;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .result-name.winner { color: #fbbf24; }
        .result-name.loser { color: rgba(255,255,255,0.35); }
        .result-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .result-scores { display: flex; gap: 0.4rem; }

        /* Tournaments */
        .tournaments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1rem;
        }
        .tournament-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 1.125rem;
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s;
        }
        .tournament-card:hover { border-color: rgba(99,102,241,0.3); }
        .tc-icon { font-size: 1.5rem; flex-shrink: 0; }
        .tc-info { flex: 1; min-width: 0; }
        .tc-name { font-weight: 700; color: #fff; font-size: 0.95rem; margin-bottom: 0.2rem; }
        .tc-venue { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-bottom: 0.4rem; }
        .tc-counts {
          display: flex;
          gap: 0.75rem;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .home-hero { padding: 2rem 0; }
          .home-hero-stats { display: none; }
          .home-two-col { grid-template-columns: 1fr; }
          .home-live-grid { grid-template-columns: 1fr; }
          .upcoming-row { grid-template-columns: 70px 1fr; }
          .upcoming-meta { display: none; }
          .tournaments-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .home-hero-title { font-size: 2rem; }
          .home-hero-actions { flex-direction: column; width: 100%; }
          .home-cta-primary, .home-cta-secondary { width: 100%; text-align: center; justify-content: center; }
          .hlc-score { gap: 0.35rem; }
          .hlc-side { gap: 0.25rem; }
          .hlc-name {
            font-size: 0.775rem;
            white-space: normal;
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }
          .hlc-pts { font-size: 1.4rem; }
          .hlc-set-info { font-size: 0.85rem; }
          .result-row { grid-template-columns: 1fr auto 1fr; gap: 0.35rem; padding: 0.75rem 0.6rem; }
          .result-name { font-size: 0.8rem; }
        }
      `}</style>
    </PublicLayout>
  );
};
