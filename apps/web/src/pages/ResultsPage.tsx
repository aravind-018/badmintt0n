import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout, StatusBadge, GameScore, formatDateTime } from '../components/PublicLayout';

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch('/api/v1/tournaments')
      .then((r) => r.json())
      .then((data) => {
        const tourns = Array.isArray(data) ? data : data.tournaments || [];
        setTournaments(tourns);
      })
      .catch((err) => console.error(err));

    fetch('/api/v1/categories')
      .then((r) => r.json())
      .then((data) => {
        const cats = Array.isArray(data) ? data : data.categories || [];
        setCategories(cats);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedTournament) params.set('tournamentId', selectedTournament);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    params.set('page', String(page));
    params.set('limit', '15');

    fetch(`/api/v1/public/results?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedTournament, selectedCategory, page]);

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-page-header">
          <h1 className="pub-page-title">Match Results</h1>
          <p className="pub-page-subtitle">Completed matches and official game-by-game scores</p>
        </div>

        {/* Filter Bar */}
        <div className="pub-filter-bar">
          <select
            className="pub-filter-select"
            value={selectedTournament}
            onChange={(e) => {
              setSelectedTournament(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className="pub-filter-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="pub-loading">
            <div className="pub-spinner" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="pub-empty">
            <span className="pub-empty-icon">🏆</span>
            <h3>No Results Found</h3>
            <p>No matches have been completed yet under the selected filters.</p>
          </div>
        ) : (
          <div>
            <div className="pub-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {results.map((match) => {
                const isSideAWinner = match.winnerId === match.sideAId;
                const isSideBWinner = match.winnerId === match.sideBId;

                return (
                  <Link
                    key={match.id}
                    to={`/match/${match.id}`}
                    className="match-row"
                  >
                    {/* Side A */}
                    <div className="match-side-a">
                      <span className={`match-player-name ${isSideAWinner ? 'winner' : 'loser'}`}>
                        {isSideAWinner && '🏆 '}
                        {match.sideAName}
                      </span>
                    </div>

                    {/* Center: Games & Status */}
                    <div className="match-center">
                      <StatusBadge status={match.status} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        {(match.games || []).map((g: any) => (
                          <GameScore
                            key={g.id || g.gameNumber}
                            sideAPoints={g.sideAPoints}
                            sideBPoints={g.sideBPoints}
                            sideAWon={g.sideAPoints > g.sideBPoints}
                            sideBWon={g.sideBPoints > g.sideAPoints}
                          />
                        ))}
                      </div>
                      <div className="match-meta">
                        <span>{match.round} • {match.category?.name || 'Category'}</span>
                        <span>{formatDateTime(match.completedAt || match.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Side B */}
                    <div className="match-side-b">
                      <span className={`match-player-name ${isSideBWinner ? 'winner' : 'loser'}`}>
                        {match.sideBName}
                        {isSideBWinner && ' 🏆'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  className="pub-filter-input"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="pub-filter-input"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
