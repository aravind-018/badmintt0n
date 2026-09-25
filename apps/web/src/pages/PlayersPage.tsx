import React, { useState, useEffect } from 'react';
import { PublicLayout } from '../components/PublicLayout';

interface Player {
  id: string;
  name: string;
  gender?: string;
  seed?: number;
  ranking?: number;
  teamId?: string;
  team?: { id: string; name: string };
}

export const PlayersPage: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/players')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.players || [];
        setPlayers(list);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.team?.name && p.team.name.toLowerCase().includes(search.toLowerCase()));
    const matchesGender = genderFilter ? p.gender === genderFilter : true;
    return matchesSearch && matchesGender;
  });

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-page-header">
          <h1 className="pub-page-title">Tournament Players</h1>
          <p className="pub-page-subtitle">Athlete profiles, seeds, rankings, and team affiliations</p>
        </div>

        {/* Filter Bar */}
        <div className="pub-filter-bar">
          <input
            type="text"
            className="pub-filter-input"
            placeholder="Search by player or team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 260 }}
          />

          <select
            className="pub-filter-select"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All Genders</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>

        {loading ? (
          <div className="pub-loading">
            <div className="pub-spinner" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading players...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="pub-empty">
            <span className="pub-empty-icon">👤</span>
            <h3>No Players Found</h3>
            <p>No players match your search filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {filteredPlayers.map((player) => (
              <div key={player.id} className="pub-card" style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(147,51,234,0.2))',
                    border: '1px solid rgba(59,130,246,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  🏸
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {player.name}
                    </h3>
                    {player.seed && (
                      <span style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '0.05rem 0.4rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700 }}>
                        Seed #{player.seed}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                    {player.team?.name && <span>🛡️ {player.team.name}</span>}
                    {player.ranking && <span>⭐ Rank #{player.ranking}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
