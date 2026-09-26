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

// DELETE /api/v1/categories/all — Delete all categories
categoryRouter.delete('/all', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;

  try {
    const categoriesToDelete = await prisma.category.findMany({ where, select: { id: true } });
    const catIds = categoriesToDelete.map((c) => c.id);

    if (catIds.length === 0) {
      res.json({ message: 'No categories found to delete', count: 0 });
      return;
    }

    const matchesToDelete = await prisma.match.findMany({
      where: { categoryId: { in: catIds } },
      select: { id: true },
    });
    const matchIds = matchesToDelete.map((m) => m.id);

    await prisma.$transaction(async (tx) => {
      if (matchIds.length > 0) {
        await tx.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.matchGame.deleteMany({ where: { matchId: { in: matchIds } } });
        await tx.match.updateMany({ where: { id: { in: matchIds } }, data: { nextMatchId: null } });
        await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      }
      await tx.standing.deleteMany({ where: { categoryId: { in: catIds } } });
      await tx.category.deleteMany({ where: { id: { in: catIds } } });
    });

    res.json({ message: 'All categories deleted successfully', count: catIds.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete categories', details: err.message });
  }
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
