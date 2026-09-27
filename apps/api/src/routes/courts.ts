import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { courtSchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const courtRouter = Router();

// GET /api/v1/courts — List courts with optional tournamentId and status filtering
courtRouter.get('/', async (req, res) => {
  const { tournamentId, status } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;
  if (status) where.status = status as any;

  const courts = await prisma.court.findMany({
    where,
    include: {
      tournament: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ courts });
});

// GET /api/v1/courts/:id — Get court by ID
courtRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  const court = await prisma.court.findUnique({
    where: { id },
    include: { tournament: { select: { id: true, name: true } } },
  });

  if (!court) {
    res.status(404).json({ error: 'Court not found' });
    return;
  }

  res.json({ court });
});

// POST /api/v1/courts — Create court
courtRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = courtSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const court = await prisma.court.create({
    data: result.data as any,
    include: { tournament: { select: { id: true, name: true } } },
  });

  res.status(201).json({ message: 'Court created successfully', court });
});

// PUT /api/v1/courts/:id — Update court
courtRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = courtSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Court not found' });
    return;
  }

  const updated = await prisma.court.update({
    where: { id },
    data: result.data,
    include: { tournament: { select: { id: true, name: true } } },
  });

  res.json({ message: 'Court updated successfully', court: updated });
});

// DELETE /api/v1/courts/:id — Delete court
courtRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Court not found' });
    return;
  }

  await prisma.court.delete({ where: { id } });

  res.json({ message: 'Court deleted successfully', id });
});
