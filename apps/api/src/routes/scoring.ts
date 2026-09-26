import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { replayMatchEvents, MatchEvent, MatchEventType } from '@badminton-live/scoring';
import { broadcastScoreUpdate, broadcastMatchEvent } from '../socket';
import { logAudit } from '../utils/audit';
import { advanceBracketWinner } from '../utils/bracket';
import { z } from 'zod';

export const scoringRouter = Router();

const scoringEventSchema = z.object({
  type: z.enum([
    'POINT_SIDE_A',
    'POINT_SIDE_B',
    'UNDO',
    'PAUSE',
    'RESUME',
    'WALKOVER',
    'RETIRE',
    'COMPLETE',
  ]),
  requestId: z.string().optional(),
  side: z.enum(['A', 'B']).optional(),
});

function getMatchTargetPoints(match: any): number {
  if (match?.currentGameState && typeof match.currentGameState === 'object' && !Array.isArray(match.currentGameState)) {
    return (match.currentGameState as any).targetPoints || 21;
  }
  return 21;
}

function getMatchMetadata(match: any) {
  const isDoubles = match?.category?.type ? match.category.type.includes('DOUBLES') : false;
  return {
    isDoubles,
    sideAName: match?.sideAName || 'Side A',
    sideBName: match?.sideBName || 'Side B',
  };
}

// GET /api/v1/matches/:id/scoring — Get match scoring state & event log
scoringRouter.get('/:id/scoring', async (req, res) => {
  const { id } = req.params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      category: true,
      court: true,
      games: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  // Convert DB match events to Scoring Engine events format
  const scoringEvents: MatchEvent[] = match.events.map((e) => ({
    id: e.id,
    matchId: e.matchId,
    gameNumber: e.gameNumber,
    type: e.type as MatchEventType,
    timestamp: e.createdAt.toISOString(),
    createdBy: e.scorerId,
  }));

  const targetPoints = getMatchTargetPoints(match);
  const metadata = getMatchMetadata(match);
  const computedState = replayMatchEvents(scoringEvents, targetPoints, metadata);

  res.json({
    match,
    state: computedState,
    events: scoringEvents,
  });
});

// POST /api/v1/matches/:id/events — Post a new point or match action
scoringRouter.post(
  '/:id/events',
  authenticateToken,
  requireRole('SCORER', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    const { id: matchId } = req.params;

    const result = scoringEventSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
      return;
    }

    const { type, requestId, side } = result.data;
    const scorerId = req.user!.id;

    // Fetch match and existing events
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        category: true,
        court: true,
        games: true,
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const targetPoints = getMatchTargetPoints(match);
    const metadata = getMatchMetadata(match);

    // Idempotency check using requestId
    if (requestId) {
      const duplicate = match.events.find((e: any) => e.stateSnapshot && (e.stateSnapshot as any).requestId === requestId);
      if (duplicate) {
        // Return existing state without duplicate action
        const scoringEvents: MatchEvent[] = match.events.map((e) => ({
          id: e.id,
          matchId: e.matchId,
          gameNumber: e.gameNumber,
          type: e.type as MatchEventType,
          timestamp: e.createdAt.toISOString(),
          createdBy: e.scorerId,
        }));
        const state = replayMatchEvents(scoringEvents, targetPoints, metadata);
        res.json({ message: 'Duplicate request ignored', state });
        return;
      }
    }

    // Check if scoring on a completed match
    if (match.status === 'COMPLETED' || match.status === 'WALKOVER' || match.status === 'RETIRED') {
      if (type === 'POINT_SIDE_A' || type === 'POINT_SIDE_B') {
        res.status(400).json({ error: 'Cannot add points to a completed match.' });
        return;
      }
    }

    // Convert current DB events to engine events
    const existingEngineEvents: MatchEvent[] = match.events.map((e) => ({
      id: e.id,
      matchId: e.matchId,
      gameNumber: e.gameNumber,
      type: e.type as MatchEventType,
      timestamp: e.createdAt.toISOString(),
      createdBy: e.scorerId,
    }));

    // Compute current state prior to new event
    const currentState = replayMatchEvents(existingEngineEvents, targetPoints, metadata);
    const currentGameNumber = currentState.currentGameNumber;

    // Create new event object
    const newEngineEvent: MatchEvent = {
      id: 'temp-' + Date.now(),
      matchId,
      gameNumber: currentGameNumber,
      type: type as MatchEventType,
      timestamp: new Date().toISOString(),
      createdBy: side || scorerId,
    };

    let nextState;
    try {
      if (type === 'UNDO') {
        const pointEvents = existingEngineEvents.filter(
          (e) => e.type === 'POINT_SIDE_A' || e.type === 'POINT_SIDE_B'
        );
        if (pointEvents.length > 0) {
          const lastPointEvent = pointEvents[pointEvents.length - 1];
          // Delete last point event from database
          await prisma.matchEvent.delete({ where: { id: lastPointEvent.id } });
        }
        // Re-fetch remaining events
        const reFetched = await prisma.matchEvent.findMany({
          where: { matchId },
          orderBy: { createdAt: 'asc' },
        });
        const remainingEvents: MatchEvent[] = reFetched.map((e) => ({
          id: e.id,
          matchId: e.matchId,
          gameNumber: e.gameNumber,
          type: e.type as MatchEventType,
          timestamp: e.createdAt.toISOString(),
          createdBy: e.scorerId,
        }));
        nextState = replayMatchEvents(remainingEvents, targetPoints, metadata);
      } else {
        nextState = replayMatchEvents([...existingEngineEvents, newEngineEvent], targetPoints, metadata);

        // Save event to database
        await prisma.matchEvent.create({
          data: {
            matchId,
            gameNumber: currentGameNumber,
            type: type as any,
            scorerId,
            stateSnapshot: { requestId: requestId || null, type, side },
          },
        });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invalid scoring event' });
      return;
    }

    // Determine winner ID if match completed
    let winnerId: string | null = null;
    if (nextState.winner === 'A') winnerId = match.sideAId;
    if (nextState.winner === 'B') winnerId = match.sideBId;

    // Update Match state in DB
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: nextState.status as any,
        sideAGamesWon: nextState.sideAGamesWon,
        sideBGamesWon: nextState.sideBGamesWon,
        winnerId: winnerId || match.winnerId,
        scorerId: match.scorerId || scorerId,
        currentGameState: { targetPoints, games: nextState.games } as any,
        completedAt: nextState.isMatchComplete ? new Date() : null,
      },
      include: {
        category: true,
        court: true,
        games: true,
      },
    });

    // Sync MatchGame records
    for (const game of nextState.games) {
      let gameWinnerId: string | null = null;
      if (game.winner === 'A') gameWinnerId = match.sideAId;
      if (game.winner === 'B') gameWinnerId = match.sideBId;

      await prisma.matchGame.upsert({
        where: { matchId_gameNumber: { matchId, gameNumber: game.gameNumber } },
        update: {
          sideAPoints: game.sideAPoints,
          sideBPoints: game.sideBPoints,
          winnerId: gameWinnerId,
          completedAt: game.isComplete ? new Date() : null,
        },
        create: {
          matchId,
          gameNumber: game.gameNumber,
          sideAPoints: game.sideAPoints,
          sideBPoints: game.sideBPoints,
          winnerId: gameWinnerId,
          completedAt: game.isComplete ? new Date() : null,
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // Automatic Knockout Bracket Winner Advancement
    // ─────────────────────────────────────────────────────────
    if (nextState.isMatchComplete || updatedMatch.status === 'COMPLETED' || updatedMatch.status === 'WALKOVER' || updatedMatch.status === 'RETIRED') {
      await advanceBracketWinner(matchId);
    }

    // ─────────────────────────────────────────────────────────
    // Audit Logging & Socket.IO Broadcasts
    // ─────────────────────────────────────────────────────────
    let auditAction: any = null;
    if (type === 'POINT_SIDE_A' || type === 'POINT_SIDE_B') auditAction = 'POINT_ADDED';
    else if (type === 'UNDO') auditAction = 'POINT_UNDONE';
    else if (type === 'PAUSE') auditAction = 'MATCH_PAUSED';
    else if (type === 'RESUME') auditAction = 'MATCH_RESUMED';

    if (nextState.isMatchComplete) auditAction = 'MATCH_COMPLETED';
    else if (nextState.status === 'LIVE' && currentState.status !== 'LIVE') auditAction = 'MATCH_STARTED';

    if (auditAction) {
      logAudit({
        userId: scorerId,
        action: auditAction,
        entity: 'Match',
        entityId: matchId,
        metadata: {
          type,
          sideAName: match.sideAName,
          sideBName: match.sideBName,
          status: nextState.status,
          gamesWon: `${nextState.sideAGamesWon}-${nextState.sideBGamesWon}`,
        },
      });
    }

    const broadcastPayload = { matchId, state: nextState, match: updatedMatch };

    // Primary score update — always broadcast
    broadcastScoreUpdate(matchId, broadcastPayload);

    // Specific lifecycle events
    if (type === 'PAUSE') {
      broadcastMatchEvent('match:paused', matchId, broadcastPayload);
    } else if (type === 'RESUME') {
      broadcastMatchEvent('match:resumed', matchId, broadcastPayload);
    } else if (nextState.isMatchComplete) {
      broadcastMatchEvent('match:completed', matchId, broadcastPayload);
      // Broadcast fixture update for bracket progression
      broadcastMatchEvent('fixture:updated', matchId, { matchId, status: 'COMPLETED', winnerId });
    } else if (nextState.status === 'LIVE' && currentState.status !== 'LIVE') {
      broadcastMatchEvent('match:started', matchId, broadcastPayload);
    }

    res.json({
      message: 'Scoring event processed',
      match: updatedMatch,
      state: nextState,
    });
  }
);

