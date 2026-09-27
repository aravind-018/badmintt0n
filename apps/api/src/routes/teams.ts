import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { teamSchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const teamRouter = Router();

// GET /api/v1/teams — List teams with tournament filter & search
teamRouter.get('/', async (req, res) => {
  const { tournamentId, search } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { organization: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      tournament: { select: { id: true, name: true, slug: true } },
      teamPlayers: { include: { player: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ teams });
});

// GET /api/v1/teams/:id — Get single team by ID
teamRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      tournament: { select: { id: true, name: true } },
      teamPlayers: { include: { player: true } },
    },
  });

  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  res.json({ team });
});

// POST /api/v1/teams — Create team
teamRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = teamSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
    return;
  }

  const team = await prisma.team.create({
    data: result.data as any,
    include: { tournament: { select: { id: true, name: true } } },
  });

  await logAudit({
    userId: req.user?.id,
    action: 'TEAM_CREATED',
    entity: 'Team',
    entityId: team.id,
    metadata: { teamName: team.name, tournamentId: team.tournamentId },
  });

  res.status(201).json({ message: 'Team created successfully', team });
});

// PUT /api/v1/teams/:id — Update team
teamRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = teamSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
    return;
  }

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const updated = await prisma.team.update({
    where: { id },
    data: result.data,
  });

  await logAudit({
    userId: req.user?.id,
    action: 'TEAM_EDITED',
    entity: 'Team',
    entityId: updated.id,
    metadata: { teamName: updated.name },
  });

  res.json({ message: 'Team updated successfully', team: updated });
});

// DELETE /api/v1/teams/all — Delete all teams (Admin only)
teamRouter.delete('/all', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;

  try {
    const teamsToDelete = await prisma.team.findMany({
      where,
      select: { id: true, name: true },
    });

    const teamIds = teamsToDelete.map((t) => t.id);

    if (teamIds.length === 0) {
      res.json({ message: 'No teams found to delete', count: 0 });
      return;
    }

    // Check if any team is assigned to existing matches/fixtures
    const matchCount = await prisma.match.count({
      where: {
        OR: [{ sideAId: { in: teamIds } }, { sideBId: { in: teamIds } }, { winnerId: { in: teamIds } }],
      },
    });

    if (matchCount > 0) {
      res.status(400).json({
        error: `Cannot delete teams because active fixtures or matches exist for these teams. Please clear fixtures first.`,
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamPlayer.deleteMany({ where: { teamId: { in: teamIds } } });
      await tx.standing.deleteMany({ where: { teamId: { in: teamIds } } });
      await tx.team.deleteMany({ where: { id: { in: teamIds } } });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'ADMIN_ACTION',
      entity: 'Team',
      metadata: { action: 'DELETE_ALL_TEAMS', deletedCount: teamIds.length, tournamentId },
    });

    res.json({ message: `Successfully deleted all ${teamIds.length} teams`, count: teamIds.length });
  } catch (err: any) {
    console.error('[Delete All Teams Error]', err);
    res.status(500).json({ error: 'Failed to delete teams safely', details: err.message });
  }
});

// DELETE /api/v1/teams/:id — Delete single team
teamRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  // Check if team is assigned to matches/fixtures
  const matchCount = await prisma.match.count({
    where: {
      OR: [{ sideAId: id }, { sideBId: id }, { winnerId: id }],
    },
  });

  if (matchCount > 0) {
    res.status(400).json({
      error: `Cannot delete team '${existing.name}' because it is assigned to existing matches/fixtures. Please clear fixtures first.`,
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamPlayer.deleteMany({ where: { teamId: id } });
    await tx.standing.deleteMany({ where: { teamId: id } });
    await tx.team.delete({ where: { id } });
  });

  await logAudit({
    userId: req.user?.id,
    action: 'ADMIN_ACTION',
    entity: 'Team',
    entityId: id,
    metadata: { action: 'DELETE_TEAM', teamName: existing.name },
  });

  res.json({ message: 'Team deleted successfully', id });
});

// POST /api/v1/teams/:id/players — Assign player to team
teamRouter.post('/:id/players', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id: teamId } = req.params;
  const { playerId, role } = req.body;

  if (!playerId) {
    res.status(400).json({ error: 'Player ID is required' });
    return;
  }

  const link = await prisma.teamPlayer.upsert({
    where: { teamId_playerId: { teamId, playerId } },
    update: { role },
    create: { teamId, playerId, role },
    include: { player: true, team: true },
  });

  res.status(201).json({ message: 'Player added to team successfully', link });
});
