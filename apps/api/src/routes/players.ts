import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { playerSchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const playerRouter = Router();

// GET /api/v1/players — List players with search & gender filtering
playerRouter.get('/', async (req, res) => {
  const { search, gender } = req.query;

  const where: any = {};
  if (gender) where.gender = gender as any;
  if (search) {
    where.name = { contains: search as string, mode: 'insensitive' };
  }

  const players = await prisma.player.findMany({
    where,
    include: {
      teamPlayers: { include: { team: { select: { id: true, name: true, tournamentId: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ players });
});

// GET /api/v1/players/:id — Get player by ID
playerRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      teamPlayers: { include: { team: true } },
    },
  });

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  res.json({ player });
});

// POST /api/v1/players — Create player
playerRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = playerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const { teamId, ...playerData } = result.data;

  const player = await prisma.player.create({
    data: playerData,
  });

  if (teamId) {
    await prisma.teamPlayer.create({
      data: {
        teamId,
        playerId: player.id,
      },
    });
  }

  const fullPlayer = await prisma.player.findUnique({
    where: { id: player.id },
    include: { teamPlayers: { include: { team: true } } },
  });

  res.status(201).json({ message: 'Player created successfully', player: fullPlayer });
});

// PUT /api/v1/players/:id — Update player
playerRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = playerSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const { teamId, ...playerData } = result.data;

  const updated = await prisma.player.update({
    where: { id },
    data: playerData,
    include: { teamPlayers: { include: { team: true } } },
  });

  res.json({ message: 'Player updated successfully', player: updated });
});

// DELETE /api/v1/players/:id — Delete player
playerRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  await prisma.teamPlayer.deleteMany({ where: { playerId: id } });
  await prisma.player.delete({ where: { id } });

  res.json({ message: 'Player deleted successfully', id });
});
