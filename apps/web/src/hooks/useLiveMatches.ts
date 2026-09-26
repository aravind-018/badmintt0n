import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';

export interface LiveGameState {
  gameNumber: number;
  sideAPoints: number;
  sideBPoints: number;
  isComplete: boolean;
  winner: 'A' | 'B' | null;
}

export interface LiveMatchState {
  currentGameNumber: number;
  sideAGamesWon: number;
  sideBGamesWon: number;
  games: LiveGameState[];
  status: string;
  isMatchComplete: boolean;
  winner: 'A' | 'B' | null;
  serving: 'A' | 'B' | null;
}

export interface LiveMatch {
  id: string;
  status: string;
  court?: { id: string; name: string };
  category?: { id: string; name: string; type: string };
  round?: string;
  sideAName: string;
  sideBName: string;
  sideAId: string;
  sideBId: string;
  startedAt?: string;
}

export interface LiveMatchEntry {
  match: LiveMatch;
  state: LiveMatchState;
}

/**
 * useLiveMatches — subscribes to the live lobby Socket.IO room.
 * Populates with REST snapshot on mount, then keeps up-to-date
 * via socket events with zero polling.
 */
export function useLiveMatches() {
  const [matches, setMatches] = useState<LiveMatchEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const upsertMatch = useCallback((entry: LiveMatchEntry) => {
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.match.id === entry.match.id);
      if (idx === -1) return [...prev, entry];
      const updated = [...prev];
      updated[idx] = entry;
      return updated;
    });
  }, []);

  const removeMatch = useCallback((matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.match.id !== matchId));
  }, []);

  const fetchRestLive = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/live');
      if (res.ok) {
        const json = await res.json();
        setMatches(json.matches || []);
        setConnected(true);
        setError(null);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Perform immediate REST fetch on mount for instant data display
    fetchRestLive();

    const socket = getSocket();

    // Connection tracking
    const onConnect = () => {
      setConnected(true);
      setError(null);
      socket.emit('join:live');
    };

    const onDisconnect = () => {
      // Do not set error; polling interval will maintain live score updates
    };

    const onConnectError = (err: Error) => {
      // Log socket warning but maintain live polling without blocking the screen
      console.warn('[Socket.IO] Real-time socket unavailable, falling back to live REST polling:', err.message);
      fetchRestLive();
    };

    // Live lobby snapshot — initial full list on join
    const onLiveSnapshot = (data: LiveMatchEntry[]) => {
      setMatches(data || []);
      setLoading(false);
    };

    // Real-time score update
    const onScoreUpdated = (data: LiveMatchEntry) => {
      if (data?.match?.id) {
        upsertMatch(data);
        setLoading(false);
      }
    };

    // Match lifecycle
    const onMatchStarted = (data: LiveMatchEntry) => {
      if (data?.match?.id) upsertMatch(data);
    };

    const onMatchCompleted = (data: LiveMatchEntry) => {
      if (data?.match?.id) {
        upsertMatch(data);
        setTimeout(() => removeMatch(data.match.id), 30000);
      }
    };

    const onMatchPaused = (data: LiveMatchEntry) => {
      if (data?.match?.id) upsertMatch(data);
    };

    const onMatchResumed = (data: LiveMatchEntry) => {
      if (data?.match?.id) upsertMatch(data);
    };

    // Register handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('live:snapshot', onLiveSnapshot);
    socket.on('match:scoreUpdated', onScoreUpdated);
    socket.on('match:started', onMatchStarted);
    socket.on('match:completed', onMatchCompleted);
    socket.on('match:paused', onMatchPaused);
    socket.on('match:resumed', onMatchResumed);

    if (socket.connected) {
      setConnected(true);
      socket.emit('join:live');
    }

    // Set up periodic REST polling (every 3 seconds) for environments without WebSockets (e.g. Vercel Serverless)
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        fetchRestLive();
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('live:snapshot', onLiveSnapshot);
      socket.off('match:scoreUpdated', onScoreUpdated);
      socket.off('match:started', onMatchStarted);
      socket.off('match:completed', onMatchCompleted);
      socket.off('match:paused', onMatchPaused);
      socket.off('match:resumed', onMatchResumed);
    };
  }, [upsertMatch, removeMatch, fetchRestLive]);

  return { matches, connected, loading, error };
}
