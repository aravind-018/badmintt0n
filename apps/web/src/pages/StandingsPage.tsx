import React, { useState, useEffect } from 'react';
import { PublicLayout } from '../components/PublicLayout';

interface StandingsItem {
  participantId: string;
  participantName: string;
  played: number;
  won: number;
  lost: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number;
}

export const StandingsPage: React.FC = () => {
  const [standings, setStandings] = useState<StandingsItem[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

    fetch(`/api/v1/public/standings?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setStandings(data.standings || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedTournament, selectedCategory]);

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-page-header">
          <h1 className="pub-page-title">Tournament Standings</h1>
          <p className="pub-page-subtitle">Current standings for Round Robin and Group Stage matches</p>
        </div>

        {/* Filter bar */}
        <div className="pub-filter-bar">
          <select
            className="pub-filter-select"
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
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
            onChange={(e) => setSelectedCategory(e.target.value)}
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
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Calculating standings...</p>
          </div>
        ) : standings.length === 0 ? (
          <div className="pub-empty">
            <span className="pub-empty-icon">📊</span>
            <h3>No Standings Available</h3>
            <p>Completed round-robin / group stage matches will generate standings automatically.</p>
          </div>
        ) : (
          <div className="pub-card" style={{ overflowX: 'auto' }}>
            <table className="standings-table">
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>Pos</th>
                  <th>Participant</th>
                  <th style={{ textAlign: 'center' }}>Played</th>
                  <th style={{ textAlign: 'center' }}>Won</th>
                  <th style={{ textAlign: 'center' }}>Lost</th>
                  <th style={{ textAlign: 'center' }}>Games (W-L)</th>
                  <th style={{ textAlign: 'center' }}>Game Diff</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, idx) => {
                  const gameDiff = row.gamesFor - row.gamesAgainst;
                  return (
                    <tr key={row.participantId || idx} className={idx === 0 ? 'leader' : ''}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{row.participantName}</td>
                      <td style={{ textAlign: 'center' }}>{row.played}</td>
                      <td style={{ textAlign: 'center', color: '#4ade80' }}>{row.won}</td>
                      <td style={{ textAlign: 'center', color: '#f87171' }}>{row.lost}</td>
                      <td style={{ textAlign: 'center' }}>
                        {row.gamesFor} – {row.gamesAgainst}
                      </td>
                      <td style={{ textAlign: 'center', color: gameDiff > 0 ? '#4ade80' : gameDiff < 0 ? '#f87171' : 'inherit' }}>
                        {gameDiff > 0 ? `+${gameDiff}` : gameDiff}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#fbbf24' }}>
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .standings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .standings-table th {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .standings-table td {
          padding: 0.9rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
        }
        .standings-table tr:last-child td { border-bottom: none; }
        .standings-table tr:hover td { background: rgba(255,255,255,0.03); }
        .standings-table tr.leader td { background: rgba(251,191,36,0.05); }
      `}</style>
    </PublicLayout>
  );
};
