import React, { useState, useEffect } from 'react';
import { PublicLayout } from '../components/PublicLayout';

interface Team {
  id: string;
  name: string;
  logo?: string;
  organization?: string;
  captain?: string;
  contact?: string;
  players?: any[];
  _count?: { players: number };
}

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/teams')
      .then((r) => r.json())
      .then((data) => {
        const teamList = Array.isArray(data) ? data : data.teams || [];
        setTeams(teamList);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.organization && t.organization.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PublicLayout>
      <div className="pub-container">
        <div className="pub-page-header">
          <h1 className="pub-page-title">Participating Teams</h1>
          <p className="pub-page-subtitle">Registered clubs, organizations, and teams competing in the tournament</p>
        </div>

        {/* Filter Bar */}
        <div className="pub-filter-bar">
          <input
            type="text"
            className="pub-filter-input"
            placeholder="Search teams or organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 360 }}
          />
        </div>

        {loading ? (
          <div className="pub-loading">
            <div className="pub-spinner" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading teams...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="pub-empty">
            <span className="pub-empty-icon">🛡️</span>
            <h3>No Teams Found</h3>
            <p>No teams match your search criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredTeams.map((team) => (
              <div key={team.id} className="pub-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                      border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                    }}
                  >
                    🛡️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{team.name}</h3>
                    {team.organization && (
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{team.organization}</span>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                  {team.captain && <div>👑 Captain: <span style={{ color: '#fff', fontWeight: 600 }}>{team.captain}</span></div>}
                  {team._count && <div>👥 Registered Players: <span style={{ color: '#fff', fontWeight: 600 }}>{team._count.players}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
