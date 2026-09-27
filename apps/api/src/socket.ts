import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from './config/env';
import { prisma } from '@badminton-live/database';
import { replayMatchEvents, MatchEvent, MatchEventType } from '@badminton-live/scoring';

let io: SocketServer;

// ─────────────────────────────────────────────────────────────
//  Broadcast Helpers — called from scoring route after any event
// ─────────────────────────────────────────────────────────────

export interface MatchScorePayload {
  matchId: string;
  state: object;
  match: object;
}

export function broadcastScoreUpdate(matchId: string, payload: MatchScorePayload) {
  if (!io) return;
  io.to(`match:${matchId}`).emit('match:scoreUpdated', payload);
  io.to('live').emit('match:scoreUpdated', payload); // Live lobby listens on global room
}

export function broadcastMatchEvent(event: string, matchId: string, payload: object) {
  if (!io) return;
  io.to(`match:${matchId}`).emit(event, payload);
  io.to('live').emit(event, payload);
}

export function broadcastToTournament(tournamentId: string, event: string, payload: object) {
  if (!io) return;
  io.to(`tournament:${tournamentId}`).emit(event, payload);
}

export function broadcastAnnouncement(payload: object) {
  if (!io) return;
  io.emit('announcement:created', payload);
}

// ─────────────────────────────────────────────────────────────
//  Socket Server Initialization
// ─────────────────────────────────────────────────────────────

export function initSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // ─────────────────────────────────────────────────────────
  //  Default namespace — public viewers and scorers
  // ─────────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const clientAddr = socket.handshake.address;
    console.log(`[Socket.IO] Client connected: ${socket.id} (${clientAddr})`);

    // ── Ping / connectivity check ───────────────────────────
    socket.on('ping', (callback: (arg: string) => void) => {
      if (typeof callback === 'function') callback('pong');
    });

    // ── Join live lobby (all active courts overview) ────────
    socket.on('join:live', async () => {
      socket.join('live');
      socket.emit('joined:live', { message: 'Subscribed to live lobby' });

      // Send current snapshot of all IN_PROGRESS matches
      try {
        const activeMatches = await getActiveLiveData();
        socket.emit('live:snapshot', activeMatches);
      } catch (err) {
        console.error('[Socket.IO] Error fetching live snapshot:', err);
      }
    });

    // ── Join specific match room ────────────────────────────
    socket.on('join:match', async (matchId: string) => {
      if (typeof matchId !== 'string' || !matchId) return;
      socket.join(`match:${matchId}`);
      socket.emit('joined:match', { matchId });

      // Send current match state immediately on join
      try {
        const snapshot = await getMatchSnapshot(matchId);
        if (snapshot) {
          socket.emit('match:snapshot', snapshot);
        }
      } catch (err) {
        console.error(`[Socket.IO] Error fetching match snapshot for ${matchId}:`, err);
      }
    });

    // ── Leave match room ────────────────────────────────────
    socket.on('leave:match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    // ── Join tournament room for announcements ──────────────
    socket.on('join:tournament', (tournamentId: string) => {
      if (typeof tournamentId !== 'string' || !tournamentId) return;
      socket.join(`tournament:${tournamentId}`);
      socket.emit('joined:tournament', { tournamentId });
    });

    // ── Leave tournament room ───────────────────────────────
    socket.on('leave:tournament', (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.IO] Socket error from ${socket.id}:`, err);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

// ─────────────────────────────────────────────────────────────
//  Helpers — fetch live data for snapshots
// ─────────────────────────────────────────────────────────────

async function getMatchSnapshot(matchId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        category: true,
        court: true,
        games: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!match) return null;

    const targetPoints = (match.currentGameState as any)?.targetPoints || 21;
    const metadata = {
      isDoubles: match.category?.type?.includes('DOUBLES'),
      sideAName: match.sideAName,
      sideBName: match.sideBName,
      initialServerName: (match.currentGameState as any)?.initialServerName,
      initialServingSide: (match.currentGameState as any)?.initialServingSide,
    };

    const scoringEvents: MatchEvent[] = (match.events || []).map((e) => ({
      id: e.id,
      matchId: e.matchId,
      gameNumber: e.gameNumber || 1,
      type: e.type as MatchEventType,
      timestamp: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
      createdBy: e.scorerId || 'SYSTEM',
    }));

    const state = replayMatchEvents(scoringEvents, targetPoints, metadata);
    return { match, state };
  } catch (err) {
    console.error(`[getMatchSnapshot Error] Match ID ${matchId}:`, err);
    return null;
  }
}

export async function getActiveLiveData() {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['LIVE', 'PAUSED'] },
      },
      include: {
        category: true,
        court: true,
        games: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return matches.map((match) => {
      try {
        const targetPoints = (match.currentGameState as any)?.targetPoints || 21;
        const metadata = {
          isDoubles: match.category?.type?.includes('DOUBLES'),
          sideAName: match.sideAName,
          sideBName: match.sideBName,
          initialServerName: (match.currentGameState as any)?.initialServerName,
          initialServingSide: (match.currentGameState as any)?.initialServingSide,
        };
        const scoringEvents: MatchEvent[] = (match.events || []).map((e) => ({
          id: e.id,
          matchId: e.matchId,
          gameNumber: e.gameNumber || 1,
          type: e.type as MatchEventType,
          timestamp: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
          createdBy: e.scorerId || 'SYSTEM',
        }));
        const state = replayMatchEvents(scoringEvents, targetPoints, metadata);
        return { match, state };
      } catch (err) {
        console.error(`[getActiveLiveData Error] Match ID ${match.id}:`, err);
        return { match, state: null };
      }
    });
  } catch (err) {
    console.error('[getActiveLiveData Top Error]:', err);
    return [];
  }
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket() first.');
  }
  return io;
}

export { io };
