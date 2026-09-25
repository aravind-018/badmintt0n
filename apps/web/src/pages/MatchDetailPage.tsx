import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout, StatusBadge, GameScore, formatDateTime } from '../components/PublicLayout';
import { QrCodeModal } from '../components/QrCodeModal';
import { replayMatchEvents, MatchEvent, MatchEventType } from '@badminton-live/scoring';

export const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/v1/matches/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Match not found');
        return r.json();
      })
      .then((data) => setMatch(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="pub-container">
          <div className="pub-loading">
            <div className="pub-spinner" />
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading match details...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !match) {
    return (
      <PublicLayout>
        <div className="pub-container">
          <div className="pub-empty">
            <span className="pub-empty-icon">❌</span>
            <h3>Match Not Found</h3>
            <p>{error || "The requested match could not be found."}</p>
            <Link to="/fixtures" className="pub-filter-input" style={{ textDecoration: 'none', marginTop: '1rem' }}>
              ← Return to Fixtures
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Replay scoring events if available
  const scoringEvents: MatchEvent[] = (match.events || []).map((e: any) => ({
    id: e.id,
    matchId: e.matchId,
    gameNumber: e.gameNumber,
    type: e.type as MatchEventType,
    timestamp: e.createdAt,
    createdBy: e.scorerId || 'scorer',
  }));

  const matchState = replayMatchEvents(scoringEvents);
  const isSideAWinner = match.winnerId === match.sideAId;
  const isSideBWinner = match.winnerId === match.sideBId;

  return (
    <PublicLayout>
      <div className="pub-container">
        {/* Back Link */}
        <div style={{ paddingTop: '1.5rem' }}>
          <Link to="/fixtures" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to Fixtures
          </Link>
        </div>

        <div className="pub-page-header" style={{ paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <StatusBadge status={match.status} size="md" />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)' }}>
                {match.round} • {match.category?.type || 'Category'}
              </span>
            </div>
            <h1 className="pub-page-title">
              {match.sideAName} vs {match.sideBName}
            </h1>
            <p className="pub-page-subtitle">
              {match.court?.name ? `Court: ${match.court.name}` : 'Court TBD'} • {formatDateTime(match.scheduledAt)}
            </p>
          </div>

          <button
            onClick={() => setIsQrOpen(true)}
            className="pub-filter-input"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc', fontWeight: 600, marginTop: '0.5rem' }}
          >
            📱 Match QR Code
          </button>
        </div>

        <QrCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          title={`${match.sideAName} vs ${match.sideBName}`}
          subtitle="Scan to view live score on mobile"
          targetPath={`/match/${match.id}`}
        />

        {/* Main Match Display Card */}
        <div className="pub-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div className="match-scoreboard">
            {/* Side A */}
            <div className="side-card">
              <div className="side-avatar">🏸</div>
              <h2 className={`side-name ${isSideAWinner ? 'winner' : ''}`}>
                {isSideAWinner && '🏆 '}
                {match.sideAName}
              </h2>
              {matchState.games.length > 0 && (
                <span className="side-games-count">{matchState.sideAGamesWon} Games Won</span>
              )}
            </div>

            {/* Score Center */}
            <div className="center-score-box">
              <div className="games-history">
                {matchState.games.map((g) => (
                  <div key={g.gameNumber} className={`game-chip ${g.isComplete ? 'complete' : 'active'}`}>
                    <span className="game-num">G{g.gameNumber}</span>
                    <span className="game-pts">{g.sideAPoints} - {g.sideBPoints}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side B */}
            <div className="side-card">
              <div className="side-avatar">🏸</div>
              <h2 className={`side-name ${isSideBWinner ? 'winner' : ''}`}>
                {match.sideBName}
                {isSideBWinner && ' 🏆'}
              </h2>
              {matchState.games.length > 0 && (
                <span className="side-games-count">{matchState.sideBGamesWon} Games Won</span>
              )}
            </div>
          </div>
        </div>

        {/* Scoring Event Log Timeline */}
        {scoringEvents.length > 0 && (
          <div className="pub-card" style={{ padding: '1.5rem' }}>
            <h3 className="pub-section-title">Point Event Timeline ({scoringEvents.length} events)</h3>
            <div className="events-timeline">
              {scoringEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="event-row">
                  <span className="event-seq">#{idx + 1}</span>
                  <span className="event-game">Game {evt.gameNumber}</span>
                  <span className={`event-type ${evt.type.includes('SIDE_A') ? 'side-a' : 'side-b'}`}>
                    {evt.type === 'POINT_SIDE_A' ? `Point to ${match.sideAName}` : evt.type === 'POINT_SIDE_B' ? `Point to ${match.sideBName}` : evt.type}
                  </span>
                  <span className="event-time">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .match-scoreboard {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 2rem;
        }
        .side-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
        }
        .side-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }
        .side-name {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }
        .side-name.winner { color: #fbbf24; }
        .side-games-count {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          font-weight: 600;
        }
        .center-score-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .games-history {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .game-chip {
          padding: 0.6rem 1rem;
          border-radius: 10px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
        }
        .game-chip.active {
          background: rgba(99,102,241,0.15);
          border-color: rgba(99,102,241,0.35);
        }
        .game-num { font-size: 0.7rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; }
        .game-pts { font-size: 1.25rem; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }

        .events-timeline {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          max-height: 320px;
          overflow-y: auto;
        }
        .event-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          font-size: 0.85rem;
        }
        .event-seq { color: rgba(255,255,255,0.3); font-weight: 700; width: 30px; }
        .event-game { color: rgba(255,255,255,0.5); font-size: 0.75rem; }
        .event-type { font-weight: 600; color: #fff; flex: 1; }
        .event-type.side-a { color: #818cf8; }
        .event-type.side-b { color: #f472b6; }
        .event-time { color: rgba(255,255,255,0.3); font-size: 0.75rem; }

        @media (max-width: 640px) {
          .match-scoreboard { grid-template-columns: 1fr; gap: 1.5rem; }
        }
      `}</style>
    </PublicLayout>
  );
};
