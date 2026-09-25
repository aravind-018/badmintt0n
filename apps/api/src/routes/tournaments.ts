import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { tournamentSchema } from '../schemas/tournament';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

export const tournamentRouter = Router();

// GET /api/v1/tournaments — List tournaments with search, filter, pagination
tournamentRouter.get('/', async (req, res) => {
  const { search, status, format, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { venue: { contains: search as string, mode: 'insensitive' } },
      { slug: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (format) {
    where.format = format;
  }

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { categories: true, teams: true, courts: true, matches: true },
        },
      },
    }),
    prisma.tournament.count({ where }),
  ]);

  res.json({
    tournaments,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/v1/tournaments/:id — Get tournament by ID or Slug
tournamentRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  const tournament = await prisma.tournament.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      categories: true,
      teams: { include: { teamPlayers: { include: { player: true } } } },
      courts: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  res.json({ tournament });
});

// POST /api/v1/tournaments — Create tournament (Protected: SUPER_ADMIN, TOURNAMENT_ADMIN)
tournamentRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = tournamentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const data = result.data;

  // Check unique slug
  const existing = await prisma.tournament.findUnique({ where: { slug: data.slug } });
  if (existing) {
    res.status(409).json({ error: `Slug '${data.slug}' is already in use.` });
    return;
  }

  const tournament = await prisma.tournament.create({
    data: {
      ...data,
      logoUrl: data.logoUrl || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      createdById: req.user!.id,
    },
  });

  res.status(201).json({ message: 'Tournament created successfully', tournament });
});

// PUT /api/v1/tournaments/:id — Update tournament (Protected: SUPER_ADMIN, TOURNAMENT_ADMIN)
tournamentRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = tournamentSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map(e => e.message) });
    return;
  }

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const updateData: any = { ...result.data };
  if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
  if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

  const updated = await prisma.tournament.update({
    where: { id },
    data: updateData,
  });

  res.json({ message: 'Tournament updated successfully', tournament: updated });
});

// DELETE /api/v1/tournaments/:id — Delete/Cancel tournament (Protected: SUPER_ADMIN, TOURNAMENT_ADMIN)
tournamentRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  await prisma.tournament.delete({ where: { id } });

  res.json({ message: 'Tournament deleted successfully', id });
});
