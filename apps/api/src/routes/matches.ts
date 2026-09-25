import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const matchRouter = Router();

const matchSchema = z.object({
  tournamentId: z.string().min(1, 'Tournament ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  round: z.string().default('Round 1'),
  courtId: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  sideAType: z.enum(['PLAYER', 'TEAM']).default('PLAYER'),
  sideAId: z.string().default('TBD'),
  sideAName: z.string().default('TBD'),
  sideBType: z.enum(['PLAYER', 'TEAM']).default('PLAYER'),
  sideBId: z.string().default('TBD'),
  sideBName: z.string().default('TBD'),
  status: z
    .enum([
      'SCHEDULED',
      'CALLED',
      'READY',
      'LIVE',
      'PAUSED',
      'COMPLETED',
      'POSTPONED',
      'CANCELLED',
      'WALKOVER',
      'RETIRED',
    ])
    .default('SCHEDULED'),
  winnerId: z.string().optional().nullable(),
  nextMatchId: z.string().optional().nullable(),
  nextMatchSlot: z.enum(['A', 'B']).optional().nullable(),
});

// GET /api/v1/matches — List matches with filters & search
matchRouter.get('/', async (req, res) => {
  const { tournamentId, categoryId, courtId, round, status, date, search } = req.query;

  const where: any = {};

  if (tournamentId) where.tournamentId = tournamentId as string;
  if (categoryId) where.categoryId = categoryId as string;
  if (courtId) where.courtId = courtId as string;
  if (round) where.round = round as string;
  if (status) where.status = status as any;

  if (date) {
    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setHours(23, 59, 59, 999);
    where.scheduledAt = { gte: startDate, lte: endDate };
  }

  if (search) {
    where.OR = [
      { sideAName: { contains: search as string, mode: 'insensitive' } },
      { sideBName: { contains: search as string, mode: 'insensitive' } },
      { round: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const matches = await prisma.match.findMany({
    where,
    include: {
      category: { select: { id: true, type: true } },
      court: { select: { id: true, name: true, location: true } },
      tournament: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
  });

  res.json({ matches });
});

// GET /api/v1/matches/:id — Get match details
matchRouter.get('/:id', async (req, res) => {
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

  res.json({ match });
});

// POST /api/v1/matches — Create manual match (Protected)
matchRouter.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const result = matchSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
    return;
  }

  const data = result.data;

  const match = await prisma.match.create({
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      courtId: data.courtId || null,
      winnerId: data.winnerId || null,
      nextMatchId: data.nextMatchId || null,
      nextMatchSlot: data.nextMatchSlot || null,
    },
    include: { category: true, court: true },
  });

  res.status(201).json({ message: 'Match created successfully', match });
});

// PUT /api/v1/matches/:id — Update match (Reschedule, Court, Status, Winner, Bracket Advancement)
matchRouter.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'SCORER'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = matchSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.errors.map((e) => e.message) });
    return;
  }

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const updateData: any = { ...result.data };
  if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);

  const updatedMatch = await prisma.match.update({
    where: { id },
    data: updateData,
    include: { category: true, court: true },
  });

  // Automatic Bracket Winner Advancement
  const isMatchFinished = updatedMatch.status === 'COMPLETED' || updatedMatch.status === 'WALKOVER';
  const winnerId = updatedMatch.winnerId;

  if (isMatchFinished && winnerId && updatedMatch.nextMatchId && updatedMatch.nextMatchSlot) {
    const winnerName = winnerId === updatedMatch.sideAId ? updatedMatch.sideAName : updatedMatch.sideBName;
    const winnerType = winnerId === updatedMatch.sideAId ? updatedMatch.sideAType : updatedMatch.sideBType;

    const nextMatchUpdate: any = {};
    if (updatedMatch.nextMatchSlot === 'A') {
      nextMatchUpdate.sideAId = winnerId;
      nextMatchUpdate.sideAName = winnerName;
      nextMatchUpdate.sideAType = winnerType;
    } else {
      nextMatchUpdate.sideBId = winnerId;
      nextMatchUpdate.sideBName = winnerName;
      nextMatchUpdate.sideBType = winnerType;
    }

    try {
      await prisma.match.update({
        where: { id: updatedMatch.nextMatchId },
        data: nextMatchUpdate,
      });
      console.log(`[Bracket Progression] Winner '${winnerName}' advanced to next match ${updatedMatch.nextMatchId} (Slot ${updatedMatch.nextMatchSlot})`);
    } catch (err) {
      console.error('[Bracket Progression Error]:', err);
    }
  }

  res.json({ message: 'Match updated successfully', match: updatedMatch });
});

// DELETE /api/v1/matches/:id — Delete match
matchRouter.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.match.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  await prisma.match.delete({ where: { id } });

  res.json({ message: 'Match deleted successfully', id });
});

// POST /api/v1/matches/generate-knockout — Automatic Knockout Bracket Generator
matchRouter.post('/generate-knockout', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId, participantIds, participantNames, courtIds } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  // Get participants (default from players if not passed)
  let players: any[] = [];
  if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
    players = participantIds.map((id: string, index: number) => ({
      id,
      name: participantNames?.[index] || `Participant ${index + 1}`,
    }));
  } else {
    const fetched = await prisma.player.findMany({ take: 8, orderBy: { seed: 'asc' } });
    players = fetched.map((p) => ({ id: p.id, name: p.name }));
  }

  // Determine rounds: Quarter Final (4 matches), Semi Final (2 matches), Final (1 match)
  const count = players.length;
  let roundsToGenerate = ['Quarter Final', 'Semi Final', 'Final'];
  if (count <= 4) roundsToGenerate = ['Semi Final', 'Final'];

  // Delete existing matches for this category in tournament
  await prisma.match.deleteMany({ where: { tournamentId, categoryId } });

  const createdMatches: any[] = [];

  // 1. Create Final
  const finalMatch = await prisma.match.create({
    data: {
      tournamentId,
      categoryId,
      round: 'Final',
      scheduledAt: new Date(Date.now() + 86400000 * 2), // 2 days later
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'Winner Semi Final 1',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'Winner Semi Final 2',
      status: 'SCHEDULED',
      courtId: courtIds?.[0] || null,
    },
  });
  createdMatches.push(finalMatch);

  // 2. Create Semi Finals (SF1 and SF2, linking to Final)
  const sf1 = await prisma.match.create({
    data: {
      tournamentId,
      categoryId,
      round: 'Semi Final',
      scheduledAt: new Date(Date.now() + 86400000), // 1 day later
      sideAType: 'PLAYER',
      sideAId: players[0]?.id || 'TBD',
      sideAName: players[0]?.name || 'Winner QF 1',
      sideBType: 'PLAYER',
      sideBId: players[3]?.id || 'TBD',
      sideBName: players[3]?.name || 'Winner QF 2',
      status: 'SCHEDULED',
      nextMatchId: finalMatch.id,
      nextMatchSlot: 'A',
      courtId: courtIds?.[0] || null,
    },
  });

  const sf2 = await prisma.match.create({
    data: {
      tournamentId,
      categoryId,
      round: 'Semi Final',
      scheduledAt: new Date(Date.now() + 86400000), // 1 day later
      sideAType: 'PLAYER',
      sideAId: players[1]?.id || 'TBD',
      sideAName: players[1]?.name || 'Winner QF 3',
      sideBType: 'PLAYER',
      sideBId: players[2]?.id || 'TBD',
      sideBName: players[2]?.name || 'Winner QF 4',
      status: 'SCHEDULED',
      nextMatchId: finalMatch.id,
      nextMatchSlot: 'B',
      courtId: courtIds?.[1] || courtIds?.[0] || null,
    },
  });

  createdMatches.push(sf1, sf2);

  // If 8 participants, create Quarter Finals
  if (count >= 8) {
    const qf1 = await prisma.match.create({
      data: {
        tournamentId,
        categoryId,
        round: 'Quarter Final',
        scheduledAt: new Date(),
        sideAType: 'PLAYER',
        sideAId: players[0]?.id || 'p1',
        sideAName: players[0]?.name || 'Player 1',
        sideBType: 'PLAYER',
        sideBId: players[7]?.id || 'p8',
        sideBName: players[7]?.name || 'Player 8',
        status: 'SCHEDULED',
        nextMatchId: sf1.id,
        nextMatchSlot: 'A',
        courtId: courtIds?.[0] || null,
      },
    });

    const qf2 = await prisma.match.create({
      data: {
        tournamentId,
        categoryId,
        round: 'Quarter Final',
        scheduledAt: new Date(),
        sideAType: 'PLAYER',
        sideAId: players[3]?.id || 'p4',
        sideAName: players[3]?.name || 'Player 4',
        sideBType: 'PLAYER',
        sideBId: players[4]?.id || 'p5',
        sideBName: players[4]?.name || 'Player 5',
        status: 'SCHEDULED',
        nextMatchId: sf1.id,
        nextMatchSlot: 'B',
        courtId: courtIds?.[1] || courtIds?.[0] || null,
      },
    });

    const qf3 = await prisma.match.create({
      data: {
        tournamentId,
        categoryId,
        round: 'Quarter Final',
        scheduledAt: new Date(),
        sideAType: 'PLAYER',
        sideAId: players[1]?.id || 'p2',
        sideAName: players[1]?.name || 'Player 2',
        sideBType: 'PLAYER',
        sideBId: players[6]?.id || 'p7',
        sideBName: players[6]?.name || 'Player 7',
        status: 'SCHEDULED',
        nextMatchId: sf2.id,
        nextMatchSlot: 'A',
        courtId: courtIds?.[2] || courtIds?.[0] || null,
      },
    });

    const qf4 = await prisma.match.create({
      data: {
        tournamentId,
        categoryId,
        round: 'Quarter Final',
        scheduledAt: new Date(),
        sideAType: 'PLAYER',
        sideAId: players[2]?.id || 'p3',
        sideAName: players[2]?.name || 'Player 3',
        sideBType: 'PLAYER',
        sideBId: players[5]?.id || 'p6',
        sideBName: players[5]?.name || 'Player 6',
        status: 'SCHEDULED',
        nextMatchId: sf2.id,
        nextMatchSlot: 'B',
        courtId: courtIds?.[3] || courtIds?.[0] || null,
      },
    });

    createdMatches.push(qf1, qf2, qf3, qf4);
  }

  res.status(201).json({
    message: `Generated Knockout bracket with ${createdMatches.length} matches`,
    matches: createdMatches,
  });
});

// POST /api/v1/matches/generate-round-robin — Automatic Round Robin Generator
matchRouter.post('/generate-round-robin', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  const players = await prisma.player.findMany({ take: 4 });
  if (players.length < 2) {
    res.status(400).json({ error: 'At least 2 players are required for Round Robin' });
    return;
  }

  // Round robin pair generation
  const createdMatches = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const match = await prisma.match.create({
        data: {
          tournamentId,
          categoryId,
          round: `Round Robin`,
          scheduledAt: new Date(Date.now() + (i + j) * 3600000),
          sideAType: 'PLAYER',
          sideAId: players[i].id,
          sideAName: players[i].name,
          sideBType: 'PLAYER',
          sideBId: players[j].id,
          sideBName: players[j].name,
          status: 'SCHEDULED',
        },
      });
      createdMatches.push(match);
    }
  }

  res.status(201).json({
    message: `Generated ${createdMatches.length} Round Robin matches`,
    matches: createdMatches,
  });
});
