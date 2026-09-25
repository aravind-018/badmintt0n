import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { categorySchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const categoryRouter = Router();

// GET /api/v1/categories — List categories with optional tournament filtering
categoryRouter.get('/', async (req, res) => {
  const { tournamentId, type } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;
  if (type) where.type = type as any;

  const categories = await prisma.category.findMany({
    where,
    include: {
      tournament: { select: { id: true, name: true, slug: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ categories });
});

// POST /api/v1/categories — Create category for a tournament
categoryRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = categorySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const { tournamentId, type } = result.data;

  // Check tournament exists
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  // Check unique category per tournament
  const existing = await prisma.category.findUnique({
    where: { tournamentId_type: { tournamentId, type } },
  });
  if (existing) {
    res.status(409).json({ error: `Category '${type}' already exists for this tournament.` });
    return;
  }

  const category = await prisma.category.create({
    data: { tournamentId, type },
    include: { tournament: { select: { id: true, name: true } } },
  });

  res.status(201).json({ message: 'Category added successfully', category });
});

// DELETE /api/v1/categories/:id — Delete category
categoryRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }

  await prisma.category.delete({ where: { id } });

  res.json({ message: 'Category removed successfully', id });
});
