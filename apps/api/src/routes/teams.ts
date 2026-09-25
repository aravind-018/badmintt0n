import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { teamSchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

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
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const team = await prisma.team.create({
    data: result.data,
    include: { tournament: { select: { id: true, name: true } } },
  });

  res.status(201).json({ message: 'Team created successfully', team });
});

// PUT /api/v1/teams/:id — Update team
teamRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = teamSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
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

  res.json({ message: 'Team updated successfully', team: updated });
});

// DELETE /api/v1/teams/:id — Delete team
teamRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  await prisma.team.delete({ where: { id } });

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
