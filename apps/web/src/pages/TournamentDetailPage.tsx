import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout, StatusBadge, formatDate } from '../components/PublicLayout';
import { QrCodeModal } from '../components/QrCodeModal';

export const TournamentDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch('/api/v1/tournaments')
      .then((r) => r.json())
      .then((data) => {
        const tourns = Array.isArray(data) ? data : data.tournaments || [];
        const found = tourns.find((t: any) => t.slug === slug || t.id === slug);
        if (!found) throw new Error('Tournament not found');
        setTournament(found);

        // Fetch matches for this tournament
        return Promise.all([
          fetch(`/api/v1/matches?tournamentId=${found.id}`).then((r) => r.json()),
          fetch(`/api/v1/categories?tournamentId=${found.id}`).then((r) => r.json()),
        ]);
      })
      .then(([matchData, catData]) => {
        setMatches(Array.isArray(matchData) ? matchData : matchData.matches || []);
        setCategories(Array.isArray(catData) ? catData : catData.categories || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="pub-container">
          <div className="pub-loading">
            <div className="pub-spinner" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading tournament details...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !tournament) {
    return (
      <PublicLayout>
        <div className="pub-container">
          <div className="pub-empty">
            <span className="pub-empty-icon">🏆</span>
            <h3>Tournament Not Found</h3>
            <p>{error || "The requested tournament slug does not exist."}</p>
            <Link to="/" className="pub-filter-input" style={{ textDecoration: 'none', marginTop: '1rem' }}>
              ← Return Home
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="pub-container">
        <div style={{ paddingTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to All Tournaments
          </Link>
        </div>

        <div className="pub-page-header" style={{ paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <StatusBadge status={tournament.status} size="md" />
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
              Format: {tournament.format}
            </span>
          </div>
          <h1 className="pub-page-title">{tournament.name}</h1>
          <p className="pub-page-subtitle">
            📍 {tournament.venue || 'Venue TBD'} • 📅 {formatDate(tournament.startDate)} to {formatDate(tournament.endDate)}
          </p>
        </div>

        {/* Overview Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '2rem' }}>
          <div className="pub-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.6rem' }}>🎯</span>
            <h3 style={{ margin: '0.4rem 0 0.1rem', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              {categories.length}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Categories</span>
          </div>

          <div className="pub-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.6rem' }}>🏸</span>
            <h3 style={{ margin: '0.4rem 0 0.1rem', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              {matches.length}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Total Matches</span>
          </div>

          <div className="pub-card" style={{ padding: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.6rem' }}>🏟️</span>
            <h3 style={{ margin: '0.4rem 0 0.1rem', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              {tournament.numberOfCourts || 4}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>Courts</span>
          </div>
        </div>

        {/* Quick Links / Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <Link to={`/fixtures?tournamentId=${tournament.id}`} className="pub-filter-input" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            📅 View Fixtures
          </Link>
          <Link to={`/standings?tournamentId=${tournament.id}`} className="pub-filter-input" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            📊 View Standings
          </Link>
          <Link to={`/bracket?tournamentId=${tournament.id}`} className="pub-filter-input" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            🌳 View Bracket
          </Link>
          <button
            onClick={() => setIsQrOpen(true)}
            className="pub-filter-input"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc', fontWeight: 600, fontSize: '0.85rem' }}
          >
            📱 Match QR Code
          </button>
        </div>

        <QrCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          title={`${tournament.name} QR Code`}
          subtitle="Scan to open tournament public page on mobile"
          targetPath={`/tournament/${tournament.slug || tournament.id}`}
        />

        {/* Categories Section */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 className="pub-section-title">Tournament Categories</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {categories.map((c) => (
                <div key={c.id} className="pub-card" style={{ padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem', color: '#fff', fontSize: '1rem' }}>{c.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{c.type} • {c.gender}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};
