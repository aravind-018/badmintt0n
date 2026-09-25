import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

// GET /api/v1/admin/audit-logs — Paginated audit log search & filter
adminRouter.get(
  '/audit-logs',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { action, userId, entity, search, limit = '20', page = '1' } = req.query;

      const take = Math.max(1, parseInt(String(limit), 10));
      const skip = Math.max(0, (parseInt(String(page), 10) - 1) * take);

      const where: any = {};
      if (action) where.action = String(action);
      if (userId) where.userId = String(userId);
      if (entity) where.entity = String(entity);

      if (search) {
        where.OR = [
          { entity: { contains: String(search), mode: 'insensitive' } },
          { entityId: { contains: String(search), mode: 'insensitive' } },
          { user: { name: { contains: String(search), mode: 'insensitive' } } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        logs,
        total,
        page: parseInt(String(page), 10),
        totalPages: Math.ceil(total / take),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  }
);

// GET /api/v1/admin/stats — Derived tournament & player statistics
adminRouter.get('/stats', async (req, res) => {
  try {
    const { tournamentId } = req.query;

    const matchWhere: any = {};
    if (tournamentId) matchWhere.tournamentId = String(tournamentId);

    const [
      matchesTotal,
      matchesCompleted,
      matchesLive,
      matchesUpcoming,
      gamesTotal,
      allCompletedGames,
      playersCount,
      teamsCount,
      allPlayers,
      completedMatches,
    ] = await Promise.all([
      prisma.match.count({ where: matchWhere }),
      prisma.match.count({ where: { ...matchWhere, status: { in: ['COMPLETED', 'WALKOVER', 'RETIRED'] } } }),
      prisma.match.count({ where: { ...matchWhere, status: { in: ['LIVE', 'PAUSED'] } } }),
      prisma.match.count({ where: { ...matchWhere, status: { in: ['SCHEDULED', 'CALLED', 'READY'] } } }),
      prisma.matchGame.count({
        where: tournamentId
          ? { match: { tournamentId: String(tournamentId) } }
          : {},
      }),
      prisma.matchGame.findMany({
        where: tournamentId
          ? { match: { tournamentId: String(tournamentId) } }
          : {},
      }),
      prisma.player.count(),
      prisma.team.count(),
      prisma.player.findMany({
        include: {
          teamPlayers: { include: { team: true } },
        },
      }),
      prisma.match.findMany({
        where: { ...matchWhere, status: { in: ['COMPLETED', 'WALKOVER', 'RETIRED'] } },
        include: { games: true },
      }),
    ]);

    // Calculate total points scored across all games
    let totalPointsScored = 0;
    for (const g of allCompletedGames) {
      totalPointsScored += g.sideAPoints + g.sideBPoints;
    }

    // Derive player statistics from completed matches
    const playerStatsMap = new Map<
      string,
      {
        id: string;
        name: string;
        matchesPlayed: number;
        wins: number;
        losses: number;
        gamesWon: number;
        gamesLost: number;
        pointsScored: number;
      }
    >();

    const getPlayerStats = (id: string, name: string) => {
      if (!playerStatsMap.has(id)) {
        playerStatsMap.set(id, {
          id,
          name: name || 'TBD',
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          gamesWon: 0,
          gamesLost: 0,
          pointsScored: 0,
        });
      }
      return playerStatsMap.get(id)!;
    };

    for (const match of completedMatches) {
      if (!match.sideAId || !match.sideBId) continue;

      const statsA = getPlayerStats(match.sideAId, match.sideAName);
      const statsB = getPlayerStats(match.sideBId, match.sideBName);

      statsA.matchesPlayed += 1;
      statsB.matchesPlayed += 1;

      if (match.winnerId === match.sideAId) {
        statsA.wins += 1;
        statsB.losses += 1;
      } else if (match.winnerId === match.sideBId) {
        statsB.wins += 1;
        statsA.losses += 1;
      }

      for (const game of match.games) {
        statsA.pointsScored += game.sideAPoints;
        statsB.pointsScored += game.sideBPoints;

        if (game.sideAPoints > game.sideBPoints) {
          statsA.gamesWon += 1;
          statsB.gamesLost += 1;
        } else if (game.sideBPoints > game.sideAPoints) {
          statsB.gamesWon += 1;
          statsA.gamesLost += 1;
        }
      }
    }

    const playerLeaderboard = Array.from(playerStatsMap.values()).sort(
      (a, b) => b.wins - a.wins || b.pointsScored - a.pointsScored
    );

    res.json({
      summary: {
        matchesTotal,
        matchesCompleted,
        matchesLive,
        matchesUpcoming,
        gamesTotal,
        totalPointsScored,
        playersCount,
        teamsCount,
      },
      playerLeaderboard,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch statistics' });
  }
});

// GET /api/v1/admin/reports/summary — Organizer Summary Report
adminRouter.get(
  '/reports/summary',
  authenticateToken,
  requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tournamentId } = req.query;

      const where: any = {};
      if (tournamentId) where.tournamentId = String(tournamentId);

      const [tournaments, categories, courts, matches] = await Promise.all([
        prisma.tournament.findMany({
          orderBy: { startDate: 'desc' },
          include: { _count: { select: { categories: true, matches: true, courts: true } } },
        }),
        prisma.category.findMany({
          where,
          include: { _count: { select: { matches: true } } },
        }),
        prisma.court.findMany({
          where,
          include: { _count: { select: { matches: true } } },
        }),
        prisma.match.findMany({
          where,
          include: { category: true, court: true },
        }),
      ]);

      const statusBreakdown = {
        SCHEDULED: matches.filter((m) => m.status === 'SCHEDULED').length,
        LIVE: matches.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED').length,
        COMPLETED: matches.filter((m) => m.status === 'COMPLETED').length,
        WALKOVER: matches.filter((m) => m.status === 'WALKOVER').length,
        RETIRED: matches.filter((m) => m.status === 'RETIRED').length,
        CANCELLED: matches.filter((m) => m.status === 'CANCELLED').length,
      };

      res.json({
        generatedAt: new Date().toISOString(),
        tournaments,
        categories,
        courts,
        matchesTotal: matches.length,
        statusBreakdown,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate summary report' });
    }
  }
);
