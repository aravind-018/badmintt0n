import { Router } from 'express';
import { prisma } from '@badminton-live/database';
import { replayMatchEvents, MatchEvent, MatchEventType } from '@badminton-live/scoring';

export const publicRouter = Router();

// ---------------------------------------------------------------------------
// Helper: Map a Prisma MatchEvent row to the scoring engine MatchEvent shape
// ---------------------------------------------------------------------------
function toScoringEvent(row: {
  id: string;
  matchId: string;
  gameNumber: number;
  type: string;
  scorerId: string;
  createdAt: Date;
}): MatchEvent {
  return {
    id: row.id,
    matchId: row.matchId,
    gameNumber: row.gameNumber,
    type: row.type as MatchEventType,
    timestamp: row.createdAt.toISOString(),
    createdBy: row.scorerId,
  };
}

// ---------------------------------------------------------------------------
// GET /api/v1/public/home
// Returns combined home-page data in a single request.
// ---------------------------------------------------------------------------
publicRouter.get('/home', async (_req, res) => {
  try {
    const now = new Date();

    const [activeMatchRows, upcomingMatches, recentResults, tournaments, announcements] = await Promise.all([
      // Active / paused matches — include events for scoring state computation
      prisma.match.findMany({
        where: { status: { in: ['LIVE', 'PAUSED'] } },
        include: {
          category: true,
          court: { select: { id: true, name: true, location: true } },
          games: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Upcoming matches (scheduled, in the future or no timestamp)
      prisma.match.findMany({
        where: {
          status: 'SCHEDULED',
        },
        include: {
          category: { select: { id: true, type: true } },
          court: { select: { id: true, name: true, location: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),

      // Recent completed results
      prisma.match.findMany({
        where: { status: { in: ['COMPLETED', 'WALKOVER', 'RETIRED'] } },
        include: {
          category: { select: { id: true, type: true } },
          court: { select: { id: true, name: true, location: true } },
          games: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 6,
      }),

      // Active/published tournaments list
      prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: {
              categories: true,
              teams: true,
              courts: true,
              matches: true,
            },
          },
        },
      }),

      // Published active announcements
      prisma.announcement.findMany({
        where: { publishedAt: { not: null } },
        include: {
          tournament: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Replay events for active matches to calculate live scoring state
    const activeMatches = activeMatchRows.map((match) => {
      const scoringEvents = (match.events || []).map(toScoringEvent);
      const computedState = replayMatchEvents(scoringEvents);
      return {
        ...match,
        computedState,
      };
    });

    const liveCourtsCount = activeMatches.length;

    res.json({
      activeMatches,
      upcomingMatches,
      recentResults,
      tournaments,
      announcements,
      liveCourtsCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch home page data' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/public/standings?tournamentId=&categoryId=
// Compute group standings from COMPLETED matches
// ---------------------------------------------------------------------------
publicRouter.get('/standings', async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.query;

    const where: any = {
      status: { in: ['COMPLETED', 'WALKOVER', 'RETIRED'] },
    };

    if (tournamentId) where.tournamentId = String(tournamentId);
    if (categoryId) where.categoryId = String(categoryId);

    const matches = await prisma.match.findMany({
      where,
      include: {
        games: true,
      },
    });

    const standingsMap = new Map<
      string,
      {
        participantId: string;
        participantName: string;
        played: number;
        won: number;
        lost: number;
        gamesFor: number;
        gamesAgainst: number;
        points: number;
      }
    >();

    const getOrCreate = (id: string, name: string) => {
      if (!standingsMap.has(id)) {
        standingsMap.set(id, {
          participantId: id,
          participantName: name || 'TBD',
          played: 0,
          won: 0,
          lost: 0,
          gamesFor: 0,
          gamesAgainst: 0,
          points: 0,
        });
      }
      return standingsMap.get(id)!;
    };

    for (const match of matches) {
      if (!match.sideAId || !match.sideBId) continue;

      const sideA = getOrCreate(match.sideAId, match.sideAName);
      const sideB = getOrCreate(match.sideBId, match.sideBName);

      sideA.played += 1;
      sideB.played += 1;

      let aGamesWon = 0;
      let bGamesWon = 0;

      for (const game of match.games) {
        if (game.sideAPoints > game.sideBPoints) aGamesWon++;
        else if (game.sideBPoints > game.sideAPoints) bGamesWon++;
      }

      sideA.gamesFor += aGamesWon;
      sideA.gamesAgainst += bGamesWon;
      sideB.gamesFor += bGamesWon;
      sideB.gamesAgainst += aGamesWon;

      if (match.winnerId === match.sideAId) {
        sideA.won += 1;
        sideA.points += 2;
        sideB.lost += 1;
      } else if (match.winnerId === match.sideBId) {
        sideB.won += 1;
        sideB.points += 2;
        sideA.lost += 1;
      }
    }

    const standings = Array.from(standingsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.gamesFor - a.gamesAgainst;
      const bDiff = b.gamesFor - b.gamesAgainst;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return b.gamesFor - a.gamesFor;
    });

    res.json({ standings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch standings' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/public/results?tournamentId=&categoryId=&limit=20&page=1
// ---------------------------------------------------------------------------
publicRouter.get('/results', async (req, res) => {
  try {
    const { tournamentId, categoryId, limit = '20', page = '1' } = req.query;

    const take = Math.max(1, parseInt(String(limit), 10));
    const skip = Math.max(0, (parseInt(String(page), 10) - 1) * take);

    const where: any = {
      status: { in: ['COMPLETED', 'WALKOVER', 'RETIRED', 'CANCELLED'] },
    };

    if (tournamentId) where.tournamentId = String(tournamentId);
    if (categoryId) where.categoryId = String(categoryId);

    const [results, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          category: { select: { id: true, type: true } },
          court: { select: { id: true, name: true, location: true } },
          tournament: { select: { id: true, name: true, slug: true } },
          games: { orderBy: { gameNumber: 'asc' } },
        },
        orderBy: { completedAt: 'desc' },
        skip,
        take,
      }),
      prisma.match.count({ where }),
    ]);

    const formattedResults = results.map((m) => {
      let winnerName = 'TBD';
      if (m.winnerId === m.sideAId) winnerName = m.sideAName;
      if (m.winnerId === m.sideBId) winnerName = m.sideBName;

      return {
        ...m,
        winnerName,
      };
    });

    res.json({
      results: formattedResults,
      total,
      page: parseInt(String(page), 10),
      totalPages: Math.ceil(total / take),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch results' });
  }
});
