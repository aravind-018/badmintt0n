import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import {
  replaySportMatchEvents,
  createInitialSportMatchState,
  applySportMatchEvent,
  SportType,
} from '@badminton-live/scoring';
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
    // Cricket
    'BALL_BOWLED',
    'RUNS_SCORED',
    'WICKET',
    'EXTRA',
    'INNINGS_END',
    'STRIKE_ROTATE',
    'NEW_BATTER',
    'NEW_BOWLER',
    // Football
    'PERIOD_START',
    'PERIOD_END',
    'GOAL',
    'CARD_YELLOW',
    'CARD_RED',
    'SUBSTITUTION',
    'PENALTY_SHOOTOUT_KICK',
    // Chess
    'MOVE_MADE',
    'CLOCK_TICK',
    'DRAW_OFFERED',
    'AGREE_DRAW',
    'RESIGNATION',
    'TIME_OUT',
    'CHECKMATE',
    // Carrom
    'COIN_POCKETED',
    'QUEEN_POCKETED',
    'QUEEN_COVERED',
    'FOUL_PENALTY',
    'BOARD_COMPLETE',
  ]),
  requestId: z.string().optional(),
  side: z.enum(['A', 'B']).optional(),
  runs: z.number().int().min(0).max(10).optional(),
  extraType: z.enum(['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY']).optional(),
  extraRuns: z.number().int().min(0).max(10).optional(),
  isWicket: z.boolean().optional(),
  wicketType: z.enum(['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED']).optional(),
  newBatterId: z.string().optional(),
  newBatterName: z.string().optional(),
  bowlerId: z.string().optional(),
  bowlerName: z.string().optional(),
  period: z.any().optional(),
  minute: z.number().int().min(0).max(180).optional(),
  addedMinute: z.number().int().min(0).max(30).optional(),
  scorerName: z.string().optional(),
  scorerId: z.string().optional(),
  assistName: z.string().optional(),
  assistId: z.string().optional(),
  isPenalty: z.boolean().optional(),
  isOwnGoal: z.boolean().optional(),
  playerName: z.string().optional(),
  playerId: z.string().optional(),
  cardReason: z.string().optional(),
  playerOutName: z.string().optional(),
  playerOutId: z.string().optional(),
  playerInName: z.string().optional(),
  playerInId: z.string().optional(),
  penaltyScored: z.boolean().optional(),
  penaltyTakerName: z.string().optional(),
  color: z.enum(['WHITE', 'BLACK']).optional(),
  san: z.string().optional(),
  remainingWhiteSeconds: z.number().optional(),
  remainingBlackSeconds: z.number().optional(),
  coinColor: z.enum(['WHITE', 'BLACK']).optional(),
  penaltyCoins: z.number().int().optional(),
  boardNumber: z.number().int().optional(),
});

function getMatchMetadata(match: any) {
  const isDoubles = match?.category?.type ? match.category.type.includes('DOUBLES') : false;
  const gameState = match?.currentGameState && typeof match.currentGameState === 'object' ? match.currentGameState : {};
  return {
    isDoubles,
    sideAId: match?.sideAId,
    sideAName: match?.sideAName || 'Side A',
    sideBId: match?.sideBId,
    sideBName: match?.sideBName || 'Side B',
    targetPoints: gameState.targetPoints || 21,
    maxOvers: gameState.maxOvers || 20,
    halfDurationMinutes: gameState.halfDurationMinutes || 45,
    initialTimeMinutes: gameState.initialTimeMinutes || 15,
    incrementSeconds: gameState.incrementSeconds || 10,
    initialServerName: gameState.initialServerName || match?.initialServerName || undefined,
    initialServingSide: gameState.initialServingSide || match?.initialServingSide || undefined,
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
      tournament: true,
      games: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const matchSport: SportType = (match.sport || match.tournament?.sport || 'BADMINTON') as SportType;
  const metadata = getMatchMetadata(match);

  // Convert DB match events to Scoring Engine events format
  const scoringEvents = match.events.map((e) => {
    const snap = (e.stateSnapshot as any) || {};
    return {
      id: e.id,
      matchId: e.matchId,
      gameNumber: e.gameNumber,
      type: e.type,
      timestamp: e.createdAt.toISOString(),
      createdBy: e.scorerId,
      ...snap,
    };
  });

  const computedState =
    match.currentGameState || replaySportMatchEvents(matchSport, scoringEvents, metadata);

  res.json({
    match,
    state: computedState,
    events: scoringEvents,
  });
});

// POST /api/v1/matches/:id/events — Post a new scoring or match action
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

    const eventPayload = result.data;
    const { type, requestId, side } = eventPayload;
    const scorerId = req.user!.id;

    // Fetch match and existing events
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        category: true,
        court: true,
        tournament: true,
        games: true,
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const matchSport: SportType = (match.sport || match.tournament?.sport || 'BADMINTON') as SportType;
    const metadata = getMatchMetadata(match);

    // Idempotency check using requestId
    if (requestId) {
      const duplicate = match.events.find(
        (e: any) => e.stateSnapshot && (e.stateSnapshot as any).requestId === requestId
      );
      if (duplicate) {
        res.json({
          message: 'Duplicate request ignored',
          state: match.currentGameState || createInitialSportMatchState(matchSport, metadata),
        });
        return;
      }
    }

    // Check if match participants are determined
    if (
      !match.sideAId ||
      match.sideAId === 'TBD' ||
      !match.sideBId ||
      match.sideBId === 'TBD' ||
      match.sideAName?.startsWith('Winner') ||
      match.sideBName?.startsWith('Winner')
    ) {
      res.status(400).json({ error: 'Cannot score a match until both participants are determined.' });
      return;
    }

    // Check if scoring on a completed match
    if (match.status === 'COMPLETED' || match.status === 'WALKOVER' || match.status === 'RETIRED') {
      if (type !== 'UNDO') {
        res.status(400).json({ error: 'Cannot add events to a completed match.' });
        return;
      }
    }

    // Convert current DB events to engine events
    const existingEngineEvents = match.events.map((e) => {
      const snap = (e.stateSnapshot as any) || {};
      return {
        id: e.id,
        matchId: e.matchId,
        gameNumber: e.gameNumber,
        type: e.type,
        timestamp: e.createdAt.toISOString(),
        createdBy: e.scorerId,
        ...snap,
      };
    });

    // Compute current state prior to new event (utilize authoritative currentGameState if present)
    const currentState: any = match.currentGameState
      ? match.currentGameState
      : (existingEngineEvents.length > 0
          ? replaySportMatchEvents(matchSport, existingEngineEvents, metadata)
          : createInitialSportMatchState(matchSport, metadata));

    const currentGameNumber = currentState.currentGameNumber || 1;

    // Create new event object
    const newEngineEvent = {
      id: 'temp-' + Date.now(),
      matchId,
      gameNumber: currentGameNumber,
      timestamp: new Date().toISOString(),
      createdBy: side || scorerId,
      ...eventPayload,
    };

    let nextState: any;
    try {
      if (type === 'UNDO') {
        if (existingEngineEvents.length > 0) {
          const lastEvent = existingEngineEvents[existingEngineEvents.length - 1];
          await prisma.matchEvent.delete({ where: { id: lastEvent.id } });
        }
        const reFetched = await prisma.matchEvent.findMany({
          where: { matchId },
          orderBy: { createdAt: 'asc' },
        });
        const remainingEvents = reFetched.map((e) => {
          const snap = (e.stateSnapshot as any) || {};
          return {
            id: e.id,
            matchId: e.matchId,
            gameNumber: e.gameNumber,
            type: e.type,
            timestamp: e.createdAt.toISOString(),
            createdBy: e.scorerId,
            ...snap,
          };
        });
        nextState = replaySportMatchEvents(matchSport, remainingEvents, metadata);
      } else {
        // Fast incremental state transition using pure sport engine
        try {
          nextState = applySportMatchEvent(matchSport, currentState, newEngineEvent, metadata);
        } catch {
          // Fallback to full replay if incremental transition fails
          nextState = replaySportMatchEvents(matchSport, [...existingEngineEvents, newEngineEvent], metadata);
        }

        // Save event to database
        await prisma.matchEvent.create({
          data: {
            matchId,
            gameNumber: currentGameNumber,
            type: type as any,
            scorerId,
            stateSnapshot: { ...eventPayload, requestId: requestId || null },
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

    // Extract sport-specific primary scores
    let sideAScore = 0;
    let sideBScore = 0;
    if (matchSport === 'FOOTBALL') {
      sideAScore = nextState.sideAGoals || 0;
      sideBScore = nextState.sideBGoals || 0;
    } else if (matchSport === 'CRICKET') {
      sideAScore = nextState.innings1?.totalRuns || 0;
      sideBScore = nextState.innings2?.totalRuns || 0;
    } else if (matchSport === 'CHESS') {
      sideAScore = Math.floor(nextState.sideAPoints || 0);
      sideBScore = Math.floor(nextState.sideBPoints || 0);
    } else if (matchSport === 'CARROM') {
      sideAScore = nextState.sideATotalPoints || 0;
      sideBScore = nextState.sideBTotalPoints || 0;
    } else {
      sideAScore = nextState.sideAGamesWon || 0;
      sideBScore = nextState.sideBGamesWon || 0;
    }

    // Update Match state in DB
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        status: nextState.status as any,
        sport: matchSport,
        sideAScore,
        sideBScore,
        sideAGamesWon: nextState.sideAGamesWon || 0,
        sideBGamesWon: nextState.sideBGamesWon || 0,
        winnerId: winnerId || (nextState.isMatchComplete && nextState.winner ? match.winnerId : null),
        scorerId: match.scorerId || scorerId,
        currentGameState: nextState as any,
        completedAt: nextState.isMatchComplete ? new Date() : null,
      },
      include: {
        category: true,
        court: true,
        tournament: true,
        games: true,
      },
    });

    // Sync MatchGame records for sets/games based sports (Badminton)
    if (Array.isArray(nextState.games)) {
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
    }

    // Automatic Knockout Bracket Winner Advancement (only if completed or winner determined)
    if (nextState.isMatchComplete || nextState.status === 'COMPLETED' || nextState.winner) {
      await advanceBracketWinner(matchId);
    }

    // Audit Logging
    let auditAction: any = null;
    if (type === 'POINT_SIDE_A' || type === 'POINT_SIDE_B' || type === 'GOAL' || type === 'RUNS_SCORED') auditAction = 'POINT_ADDED';
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
          sport: matchSport,
          type,
          sideAName: match.sideAName,
          sideBName: match.sideBName,
          status: nextState.status,
          score: `${sideAScore}-${sideBScore}`,
        },
      });
    }

    const broadcastPayload = { matchId, state: nextState, match: updatedMatch };

    // Primary score update — broadcast to room and lobby
    broadcastScoreUpdate(matchId, broadcastPayload);

    if (type === 'PAUSE') {
      broadcastMatchEvent('match:paused', matchId, broadcastPayload);
    } else if (type === 'RESUME') {
      broadcastMatchEvent('match:resumed', matchId, broadcastPayload);
    } else if (nextState.isMatchComplete) {
      broadcastMatchEvent('match:completed', matchId, broadcastPayload);
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
