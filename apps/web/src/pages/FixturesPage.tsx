import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout, StatusBadge, GameScore, formatDateTime, formatTime, formatDate } from '../components/PublicLayout';

export const FixturesPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = `/api/v1/matches?`;
      if (search) q += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) q += `status=${statusFilter}&`;
      if (categoryFilter) q += `categoryId=${categoryFilter}&`;
      if (courtFilter) q += `courtId=${courtFilter}&`;
      if (roundFilter) q += `round=${encodeURIComponent(roundFilter)}&`;
      if (dateFilter) q += `date=${dateFilter}&`;

      const [mRes, catRes, courtRes] = await Promise.all([
        fetch(q),
        fetch('/api/v1/categories'),
        fetch('/api/v1/courts'),
      ]);

      const mData = await mRes.json();
      const catData = await catRes.json();
      const courtData = await courtRes.json();

      setMatches(mData.matches || []);
      setCategories(catData.categories || []);
      setCourts(courtData.courts || []);
    } catch {
      setError('Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, courtFilter, roundFilter, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by status for display
  const live = matches.filter(m => m.status === 'LIVE' || m.status === 'PAUSED');
  const upcoming = matches.filter(m => ['SCHEDULED','CALLED','READY'].includes(m.status));
  const completed = matches.filter(m => ['COMPLETED','WALKOVER','RETIRED','POSTPONED','CANCELLED'].includes(m.status));

  const hasFilters = !!(search || statusFilter || categoryFilter || courtFilter || roundFilter || dateFilter);

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-page-header">
          <h1 className="pub-page-title">Fixtures</h1>
          <p className="pub-page-subtitle">All scheduled, live and completed matches</p>
        </div>

        {/* Filters */}
        <div className="pub-filter-bar">
          <input
            className="pub-filter-input"
            style={{ flexGrow: 1, minWidth: '160px', maxWidth: '280px' }}
            placeholder="Search player or team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="pub-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            <option value="LIVE">Live</option>
            <option value="PAUSED">Paused</option>
            <option value="SCHEDULED">Upcoming</option>
            <option value="COMPLETED">Completed</option>
            <option value="WALKOVER">Walkover</option>
          </select>
          <select className="pub-filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="pub-filter-select" value={courtFilter} onChange={e => setCourtFilter(e.target.value)}>
            <option value="">All courts</option>
            {courts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="pub-filter-input"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          {hasFilters && (
            <button
              className="pub-filter-select"
              style={{ cursor: 'pointer', color: '#a5b4fc' }}
              onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setCourtFilter(''); setRoundFilter(''); setDateFilter(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {loading && (
          <div className="pub-loading"><div className="pub-spinner" /></div>
        )}
        {error && (
          <div className="pub-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="pub-empty">
            <div className="pub-empty-icon">📅</div>
            <h3>No fixtures found</h3>
            <p>{hasFilters ? 'Try adjusting your filters' : 'No matches have been scheduled yet'}</p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <>
            {/* Live section */}
            {live.length > 0 && (
              <MatchSection title="Live Now" matches={live} showScore />
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <MatchSection title="Upcoming" matches={upcoming} />
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <MatchSection title="Completed" matches={completed} showScore />
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
};

// ─────────────────────────────────────────────────────────────
//  Match Section
// ─────────────────────────────────────────────────────────────

function MatchSection({ title, matches, showScore }: { title: string; matches: any[]; showScore?: boolean }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <p className="pub-section-title">{title} ({matches.length})</p>
      <div className="pub-card">
        {matches.map((m) => (
          <FixtureRow key={m.id} match={m} showScore={showScore} />
        ))}
      </div>
    </section>
  );
}

function FixtureRow({ match, showScore }: { match: any; showScore?: boolean }) {
  const sideAWon = match.winnerId === match.sideAId;
  const sideBWon = match.winnerId === match.sideBId;
  const isCompleted = ['COMPLETED','WALKOVER','RETIRED'].includes(match.status);

  return (
    <Link to={`/match/${match.id}`} className="fixture-row">
      {/* Time + court */}
      <div className="fixture-datetime">
        {match.scheduledAt ? (
          <>
            <span className="fix-date">{formatDate(match.scheduledAt)}</span>
            <span className="fix-time">{formatTime(match.scheduledAt)}</span>
          </>
        ) : <span className="fix-time">TBD</span>}
        {match.court && <span className="fix-court">{match.court.name}</span>}
      </div>

      {/* Side A */}
      <div className="fixture-side-a">
        <span className={`fixture-name ${sideAWon ? 'winner' : isCompleted && sideBWon ? 'loser' : ''}`}>
          {match.sideAName || 'TBD'}
        </span>
      </div>

      {/* Center: status + score */}
      <div className="fixture-center">
        <StatusBadge status={match.status} />
        {showScore && match.games && match.games.length > 0 && (
          <div className="fix-scores">
            {match.games.map((g: any) => (
              <span key={g.gameNumber} className="fix-game-score">
                {g.sideAPoints}–{g.sideBPoints}
              </span>
            ))}
          </div>
        )}
        {match.round && <span className="fix-round">{match.round}</span>}
      </div>

      {/* Side B */}
      <div className="fixture-side-b">
        <span className={`fixture-name ${sideBWon ? 'winner' : isCompleted && sideAWon ? 'loser' : ''}`}>
          {match.sideBName || 'TBD'}
        </span>
      </div>

      {/* Category */}
      <div className="fixture-category">
        {match.category && <span>{match.category.name}</span>}
      </div>

      <style>{`
        .fixture-row {
          display: grid;
          grid-template-columns: 100px 1fr auto 1fr 80px;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }
        .fixture-row:last-child { border-bottom: none; }
        .fixture-row:hover { background: rgba(255,255,255,0.04); }

        .fixture-datetime {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          flex-shrink: 0;
        }
        .fix-date { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
        .fix-time { font-size: 0.85rem; font-weight: 700; color: #a5b4fc; }
        .fix-court { font-size: 0.7rem; color: rgba(255,255,255,0.35); }

        .fixture-side-a { text-align: right; min-width: 0; }
        .fixture-side-b { text-align: left; min-width: 0; }
        .fixture-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #e2e8f0;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fixture-name.winner { color: #fbbf24; }
        .fixture-name.loser { color: rgba(255,255,255,0.35); }

        .fixture-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          flex-shrink: 0;
          min-width: 90px;
        }
        .fix-scores { display: flex; gap: 0.5rem; }
        .fix-game-score {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          font-variant-numeric: tabular-nums;
        }
        .fix-round {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.3);
          text-align: center;
        }

        .fixture-category {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          text-align: right;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .fixture-row {
            grid-template-columns: 1fr auto 1fr;
            grid-template-rows: auto auto;
          }
          .fixture-datetime { display: none; }
          .fixture-category { display: none; }
          .fixture-side-a { grid-column: 1; }
          .fixture-center { grid-column: 2; }
          .fixture-side-b { grid-column: 3; }
        }
      `}</style>
    </Link>
  );
}
