import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { advanceBracketWinner } from '../utils/bracket';
import { z } from 'zod';
import {
  distributeTeamsIntoGroups,
  generateGroupRoundRobinMatches,
  generateNormalRoundRobinMatches,
  seedKnockoutFirstRound,
  createKnockoutMatchesInTx,
  updateGroupStandingsAndQualification,
  Participant,
  QualifiedSlot,
} from '../utils/fixtureGenerator';
import { validateGroupKnockoutConfig, isPowerOfTwo, getNextPowerOfTwo, getKnockoutRoundName } from '@badminton-live/shared';
import { logAudit } from '../utils/audit';

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
  targetPoints: z.number().int().min(1).max(100).optional().default(21),
  initialServerName: z.string().optional().nullable(),
  initialServingSide: z.enum(['A', 'B']).optional().nullable(),
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

// GET /api/v1/matches/group-standings — Fetch separate group standings for a category/tournament
matchRouter.get('/group-standings', async (req, res) => {
  const { tournamentId, categoryId } = req.query;

  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament ID is required' });
    return;
  }

  try {
    const tId = String(tournamentId);
    const cId = categoryId ? String(categoryId) : undefined;

    let progress = null;
    if (cId) {
      try {
        progress = await updateGroupStandingsAndQualification(tId, cId);
      } catch (err) {
        console.warn('[Group Standings Warning] Failed to update standings on-the-fly:', err);
      }
    }

    const where: any = { tournamentId: tId };
    if (cId) where.categoryId = cId;

    const standings = await prisma.standing.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, logoUrl: true, organization: true } },
      },
      orderBy: [{ groupOrder: 'asc' }, { position: 'asc' }],
    });

    // Group standings by groupName
    const groupsMap: Record<string, any[]> = {};
    for (const s of standings) {
      const gName = s.groupName || 'Overall Standings';
      if (!groupsMap[gName]) groupsMap[gName] = [];
      groupsMap[gName].push(s);
    }

    res.json({
      groups: groupsMap,
      progress,
      standings,
    });
  } catch (err: any) {
    console.error('[Group Standings Error]', err);
    res.status(500).json({ error: 'Failed to compute group standings', details: err.message });
  }
});

// GET /api/v1/matches/group-fixtures — Fetch group stage fixtures for a tournament/category
matchRouter.get('/group-fixtures', async (req, res) => {
  const { tournamentId, categoryId } = req.query;

  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament ID is required' });
    return;
  }

  try {
    const tId = String(tournamentId);
    const cId = categoryId ? String(categoryId) : undefined;

    const where: any = { tournamentId: tId };
    if (cId) where.categoryId = cId;
    where.OR = [
      { stage: 'GROUP' },
      { stage: 'GROUP_STAGE' },
      { stage: 'ROUND_ROBIN' },
      { groupId: { not: null } },
      { round: { startsWith: 'Group' } },
      { round: { startsWith: 'Round Robin' } },
    ];

    const matches = await prisma.match.findMany({
      where,
      include: {
        category: { select: { id: true, type: true } },
        court: { select: { id: true, name: true, location: true } },
        tournament: { select: { id: true, name: true, slug: true } },
        games: true,
      },
      orderBy: [{ groupOrder: 'asc' }, { roundNumber: 'asc' }, { matchNumber: 'asc' }, { createdAt: 'asc' }],
    });

    // Group matches by groupName
    const groupsMap: Record<string, any[]> = {};
    for (const m of matches) {
      const gName = m.groupName || (m.round && m.round.includes('Group') ? m.round.split('-')[0].trim() : 'Group Stage');
      if (!groupsMap[gName]) groupsMap[gName] = [];
      groupsMap[gName].push(m);
    }

    res.json({
      tournamentId: tId,
      categoryId: cId || null,
      groups: groupsMap,
      fixtures: matches,
    });
  } catch (err: any) {
    console.error('[Group Fixtures Error]', err);
    res.status(500).json({ error: 'Failed to fetch group fixtures', details: err.message });
  }
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

  // Validation: Prevent a team or player from playing against itself
  const isSameId = data.sideAId && data.sideAId !== 'TBD' && data.sideAId === data.sideBId;
  const isSameName =
    data.sideAName &&
    data.sideAName !== 'TBD' &&
    data.sideAName.trim().toLowerCase() === data.sideBName.trim().toLowerCase();

  if (isSameId || isSameName) {
    res.status(400).json({ error: 'A team cannot play against itself.' });
    return;
  }

  const { targetPoints, ...matchPayload } = data;

  const match = await prisma.match.create({
    data: {
      ...matchPayload,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      courtId: data.courtId || null,
      winnerId: data.winnerId || null,
      nextMatchId: data.nextMatchId || null,
      nextMatchSlot: data.nextMatchSlot || null,
      currentGameState: { targetPoints: targetPoints || 21, games: [] } as any,
    } as any,
    include: { category: true, court: true },
  });

  res.status(201).json({ message: 'Match created successfully', match });
});

// PUT /api/v1/matches/:id — Update match (Reschedule, Court, Status, Winner, Target Points, Bracket Advancement)
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

  const { targetPoints, initialServerName, initialServingSide, ...updatePayload } = result.data as any;
  const updateData: any = { ...updatePayload };
  if (updateData.scheduledAt) updateData.scheduledAt = new Date(updateData.scheduledAt);

  // Validation: Prevent a team or player from playing against itself
  const newSideAId = updateData.sideAId !== undefined ? updateData.sideAId : existing.sideAId;
  const newSideBId = updateData.sideBId !== undefined ? updateData.sideBId : existing.sideBId;
  const newSideAName = updateData.sideAName !== undefined ? updateData.sideAName : existing.sideAName;
  const newSideBName = updateData.sideBName !== undefined ? updateData.sideBName : existing.sideBName;

  const isSameId = newSideAId && newSideAId !== 'TBD' && newSideAId === newSideBId;
  const isSameName =
    newSideAName &&
    newSideAName !== 'TBD' &&
    newSideAName.trim().toLowerCase() === newSideBName.trim().toLowerCase();

  if (isSameId || isSameName) {
    res.status(400).json({ error: 'A team cannot play against itself.' });
    return;
  }

  const existingState = (existing.currentGameState as any) || {};
  const newGameState = { ...existingState };
  if (targetPoints !== undefined) newGameState.targetPoints = targetPoints;
  if (initialServerName !== undefined) newGameState.initialServerName = initialServerName;
  if (initialServingSide !== undefined) newGameState.initialServingSide = initialServingSide;
  updateData.currentGameState = newGameState;

  const updatedMatch = await prisma.match.update({
    where: { id },
    data: updateData,
    include: { category: true, court: true },
  });

  // Automatic Bracket Winner Advancement
  await advanceBracketWinner(id);

  res.json({ message: 'Match updated successfully', match: updatedMatch });
});

// DELETE /api/v1/matches/all — Delete all matches / fixtures
matchRouter.delete('/all', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;
  if (categoryId) where.categoryId = categoryId as string;

  try {
    const matchesToDelete = await prisma.match.findMany({ where, select: { id: true } });
    const matchIds = matchesToDelete.map((m) => m.id);

    if (matchIds.length === 0) {
      res.json({ message: 'No matches found to delete', count: 0 });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.matchGame.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.match.updateMany({ where: { id: { in: matchIds } }, data: { nextMatchId: null } });
      await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      // Clear group standings so the Group Stage view resets completely
      await tx.standing.deleteMany({ where });
    });

    res.json({ message: 'All fixtures and standings deleted successfully', count: matchIds.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete fixtures', details: err.message });
  }
});


// DELETE /api/v1/matches/brackets/all — Delete all bracket matches
matchRouter.delete('/brackets/all', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId } = req.query;

  const where: any = {};
  if (tournamentId) where.tournamentId = tournamentId as string;
  if (categoryId) where.categoryId = categoryId as string;

  try {
    const matchesToDelete = await prisma.match.findMany({ where, select: { id: true } });
    const matchIds = matchesToDelete.map((m) => m.id);

    if (matchIds.length === 0) {
      res.json({ message: 'No bracket matches found to delete', count: 0 });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.matchGame.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.match.updateMany({ where: { id: { in: matchIds } }, data: { nextMatchId: null } });
      await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      // Clear standings so Group Stage view resets completely
      await tx.standing.deleteMany({ where });
    });

    res.json({ message: 'Bracket and standings deleted successfully', count: matchIds.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete bracket matches', details: err.message });
  }
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



// ── Eligibility types ──────────────────────────────────────────────────────────

interface ExcludedEntry {
  id: string;
  name: string;
  reason: string;
}

interface EligibilityResult {
  eligible: Participant[];
  excluded: ExcludedEntry[];
  categoryType: string;
}

/**
 * Determines which teams/players are eligible for the selected category.
 *
 * Eligibility rules (using actual Player.gender data — NOT team-name guessing):
 *   MENS_DOUBLES   — team must have ≥ 2 players, all checked male (≥ 2 MALE)
 *   WOMENS_DOUBLES — team must have ≥ 2 players, all checked female (≥ 2 FEMALE)
 *   MIXED_DOUBLES  — team must have ≥ 2 players, ≥ 1 MALE + ≥ 1 FEMALE
 *   MENS_SINGLES   — team entry's primary player must be MALE (or gender unknown → legacy include)
 *   WOMENS_SINGLES — team entry's primary player must be FEMALE (or gender unknown → legacy include)
 *   TEAM_EVENT     — all teams eligible
 *
 * Falls back to all teams if no gender data exists (legacy data guard).
 */
async function getCategoryEligibility(tournamentId: string, categoryId: string): Promise<EligibilityResult> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return { eligible: [], excluded: [], categoryType: 'UNKNOWN' };

  const catType = category.type as string; // CategoryType enum value

  const isDoubles = ['MENS_DOUBLES', 'WOMENS_DOUBLES', 'MIXED_DOUBLES'].includes(catType);
  const isSingles = ['MENS_SINGLES', 'WOMENS_SINGLES'].includes(catType);

  const teams = await prisma.team.findMany({
    where: { tournamentId },
    include: { teamPlayers: { include: { player: true } } },
    orderBy: { name: 'asc' },
  });

  const eligible: Participant[] = [];
  const excluded: ExcludedEntry[] = [];

  // ── DOUBLES ────────────────────────────────────────────────────────────────
  if (isDoubles) {
    for (const team of teams) {
      const players = team.teamPlayers.map((tp: any) => tp.player);
      const maleCount = players.filter((p: any) => p.gender === 'MALE').length;
      const femaleCount = players.filter((p: any) => p.gender === 'FEMALE').length;
      const hasGenderData = maleCount + femaleCount > 0;

      if (players.length < 2) {
        excluded.push({ id: team.id, name: team.name, reason: 'Incomplete team (requires 2 players)' });
        continue;
      }

      let isEligible = false;
      let reason = '';

      if (catType === 'MENS_DOUBLES') {
        if (!hasGenderData) {
          isEligible = true; // legacy: no gender data → include
        } else if (maleCount >= 2) {
          isEligible = true;
        } else if (femaleCount >= 2) {
          reason = "Excluded — Women's Doubles team";
        } else {
          reason = "Excluded — Mixed team (Men's Doubles requires 2 male players)";
        }
      } else if (catType === 'WOMENS_DOUBLES') {
        if (!hasGenderData) {
          isEligible = true;
        } else if (femaleCount >= 2) {
          isEligible = true;
        } else if (maleCount >= 2) {
          reason = "Excluded — Men's Doubles team";
        } else {
          reason = "Excluded — Mixed team (Women's Doubles requires 2 female players)";
        }
      } else if (catType === 'MIXED_DOUBLES') {
        if (!hasGenderData) {
          isEligible = true;
        } else if (maleCount >= 1 && femaleCount >= 1) {
          isEligible = true;
        } else if (maleCount >= 2) {
          reason = "Excluded — Men's team (Mixed Doubles requires 1M + 1F)";
        } else {
          reason = "Excluded — Women's team (Mixed Doubles requires 1M + 1F)";
        }
      }

      if (isEligible) {
        let name = team.name;
        if (players.length >= 2) {
          const pairNames = players.slice(0, 2).map((p: any) => p.name).join(' / ');
          name = `${pairNames} (${team.name})`;
        }
        eligible.push({ id: team.id, name, type: 'TEAM' });
      } else {
        excluded.push({ id: team.id, name: team.name, reason });
      }
    }

  // ── SINGLES ────────────────────────────────────────────────────────────────
  } else if (isSingles) {
    if (teams.length >= 2) {
      // Each team entry represents a singles player slot
      for (const team of teams) {
        const players = team.teamPlayers.map((tp: any) => tp.player);

        if (players.length === 0) {
          // No player linked → legacy include (cannot validate)
          eligible.push({ id: team.id, name: team.name, type: 'TEAM' });
          continue;
        }

        const primary = players[0];
        const displayName = primary.name || team.name;

        // If gender is OTHER or not deterministic, include as legacy fallback
        if (primary.gender !== 'MALE' && primary.gender !== 'FEMALE') {
          eligible.push({ id: team.id, name: displayName, type: 'TEAM' });
          continue;
        }

        if (catType === 'MENS_SINGLES') {
          if (primary.gender === 'MALE') {
            eligible.push({ id: team.id, name: displayName, type: 'TEAM' });
          } else {
            excluded.push({ id: team.id, name: team.name, reason: "Excluded — Female player (Men's Singles)" });
          }
        } else if (catType === 'WOMENS_SINGLES') {
          if (primary.gender === 'FEMALE') {
            eligible.push({ id: team.id, name: displayName, type: 'TEAM' });
          } else {
            excluded.push({ id: team.id, name: team.name, reason: "Excluded — Male player (Women's Singles)" });
          }
        }
      }
    } else {
      // Fallback: use standalone Player records
      const fetchedPlayers = await prisma.player.findMany({ orderBy: [{ seed: 'asc' }, { name: 'asc' }] });
      for (const p of fetchedPlayers) {
        if (catType === 'MENS_SINGLES') {
          if (p.gender === 'MALE') {
            eligible.push({ id: p.id, name: p.name, type: 'PLAYER' });
          } else {
            excluded.push({ id: p.id, name: p.name, reason: "Excluded — Not eligible for Men's Singles" });
          }
        } else if (catType === 'WOMENS_SINGLES') {
          if (p.gender === 'FEMALE') {
            eligible.push({ id: p.id, name: p.name, type: 'PLAYER' });
          } else {
            excluded.push({ id: p.id, name: p.name, reason: "Excluded — Not eligible for Women's Singles" });
          }
        }
      }
    }

  // ── TEAM EVENT / FALLBACK ──────────────────────────────────────────────────
  } else {
    for (const team of teams) {
      eligible.push({ id: team.id, name: team.name, type: 'TEAM' });
    }
  }

  return { eligible, excluded, categoryType: catType };
}

// Backward-compatible wrapper: returns only eligible participants (used by existing callers)
async function getCategoryParticipants(tournamentId: string, categoryId: string): Promise<Participant[]> {
  const result = await getCategoryEligibility(tournamentId, categoryId);
  return result.eligible;
}


// POST /api/v1/matches/eligible-participants — Get eligible/excluded participants for a category
matchRouter.post('/eligible-participants', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  try {
    const result = await getCategoryEligibility(tournamentId, categoryId);
    const category = await prisma.category.findUnique({ where: { id: categoryId } });

    res.json({
      categoryType: result.categoryType,
      categoryLabel: category?.type?.replace(/_/g, ' ') || result.categoryType,
      totalEligible: result.eligible.length,
      totalExcluded: result.excluded.length,
      eligible: result.eligible,
      excluded: result.excluded,
    });
  } catch (err: any) {
    console.error('[Eligible Participants Error]', err);
    res.status(500).json({ error: 'Failed to determine eligible participants', details: err.message });
  }
});


// GET /api/v1/matches/qualified-teams — Get qualified teams for knockout stage by group
matchRouter.get('/qualified-teams', async (req, res) => {
  const { tournamentId, categoryId } = req.query;

  if (!tournamentId) {
    res.status(400).json({ error: 'Tournament ID is required' });
    return;
  }

  try {
    const tId = String(tournamentId);
    const cId = categoryId ? String(categoryId) : undefined;

    const where: any = { tournamentId: tId, qualified: true };
    if (cId) where.categoryId = cId;

    const standings = await prisma.standing.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, logoUrl: true, organization: true } },
      },
      orderBy: [{ groupOrder: 'asc' }, { position: 'asc' }],
    });

    const groupsMap: Record<string, any[]> = {};
    for (const s of standings) {
      const gName = s.groupName || 'Group A';
      if (!groupsMap[gName]) groupsMap[gName] = [];
      groupsMap[gName].push(s);
    }

    res.json({
      tournamentId: tId,
      categoryId: cId || null,
      totalQualified: standings.length,
      groups: groupsMap,
      qualifiedTeams: standings,
    });
  } catch (err: any) {
    console.error('[Qualified Teams Error]', err);
    res.status(500).json({ error: 'Failed to fetch qualified teams', details: err.message });
  }
});

// POST /api/v1/matches/preview-fixtures — Preview fixture generation details before confirming
matchRouter.post('/preview-fixtures', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId, format: requestedFormat, numberOfGroups: reqGroups, qualifiersPerGroup: reqQualifiers } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  const { eligible: participants, excluded, categoryType } = await getCategoryEligibility(tournamentId, categoryId);
  const totalTeams = participants.length;

  const existingMatchesCount = await prisma.match.count({
    where: { tournamentId, categoryId },
  });

  const format: string = requestedFormat || (totalTeams >= 6 ? 'GROUP_KNOCKOUT' : 'KNOCKOUT');

  if (format === 'ROUND_ROBIN') {
    const totalMatches = (totalTeams * (totalTeams - 1)) / 2;
    res.json({
      preview: {
        tournamentFormat: 'ROUND_ROBIN',
        categoryType,
        totalTeams,
        totalEligible: totalTeams,
        totalExcluded: excluded.length,
        numberOfGroups: 0,
        groups: [],
        totalGroupMatches: 0,
        qualificationRule: 'N/A (No Knockout)',
        expectedQualified: 0,
        knockoutStructure: 'No Knockout — League Only',
        totalRoundRobinMatches: totalMatches,
        eligibleList: participants.map(p => p.name),
        fixturesExist: existingMatchesCount > 0,
        existingMatchesCount,
        isValid: true,
      },
    });
    return;
  }

  if (format === 'KNOCKOUT') {
    if (totalTeams < 2) {
      res.json({
        preview: {
          tournamentFormat: 'KNOCKOUT',
          categoryType,
          totalTeams,
          totalEligible: totalTeams,
          totalExcluded: excluded.length,
          numberOfGroups: 0,
          groups: [],
          totalGroupMatches: 0,
          qualificationRule: 'N/A (Knockout)',
          expectedQualified: totalTeams,
          knockoutStructure: 'Knockout Bracket',
          eligibleList: participants.map((p) => p.name),
          fixturesExist: existingMatchesCount > 0,
          existingMatchesCount,
          isValid: false,
          validationError: 'At least 2 eligible teams are required for a knockout tournament.',
        },
      });
      return;
    }

    const targetBracket = getNextPowerOfTwo(totalTeams);
    const preliminaryMatches = totalTeams === targetBracket ? 0 : totalTeams - targetBracket / 2;
    const preliminaryParticipants = preliminaryMatches * 2;
    const directQualifiers = totalTeams - preliminaryParticipants;
    const mainBracketTeams = preliminaryMatches + directQualifiers;
    const isPower = isPowerOfTwo(totalTeams);
    const roundName = getKnockoutRoundName(isPower ? totalTeams : targetBracket / 2);

    const knockoutStructure = isPower
      ? `${roundName} (${totalTeams} teams) → Grand Final`
      : `${preliminaryMatches} Preliminary ${preliminaryMatches === 1 ? 'Match' : 'Matches'} → ${roundName} (${mainBracketTeams} teams) → Grand Final`;

    res.json({
      preview: {
        tournamentFormat: 'KNOCKOUT',
        categoryType,
        totalTeams,
        targetBracket,
        preliminaryMatches,
        directQualifiers,
        mainBracketTeams,
        totalEligible: totalTeams,
        totalExcluded: excluded.length,
        numberOfGroups: 0,
        groups: [],
        totalGroupMatches: 0,
        qualificationRule: 'N/A (Knockout)',
        expectedQualified: totalTeams,
        knockoutStructure,
        eligibleList: participants.map((p) => p.name),
        fixturesExist: existingMatchesCount > 0,
        existingMatchesCount,
        isValid: true,
        validationError: null,
      },
    });
    return;
  }

  // GROUP_STAGE / GROUP_KNOCKOUT format
  const numGroups = reqGroups ? Number(reqGroups) : Math.max(1, Math.ceil(totalTeams / 4));
  const qualPerGroup = reqQualifiers ? Number(reqQualifiers) : 2;

  const validation = validateGroupKnockoutConfig(totalTeams, numGroups, qualPerGroup);
  const groups = distributeTeamsIntoGroups(participants, numGroups);

  let totalGroupMatches = 0;
  groups.forEach((g) => {
    totalGroupMatches += (g.teams.length * (g.teams.length - 1)) / 2;
  });

  res.json({
    preview: {
      tournamentFormat: 'GROUP_KNOCKOUT',
      categoryType,
      totalTeams,
      totalEligible: totalTeams,
      totalExcluded: excluded.length,
      numberOfGroups: numGroups,
      qualifiersPerGroup: qualPerGroup,
      expectedQualified: validation.qualifiedTeams,
      knockoutStructure: validation.valid
        ? `${validation.knockoutRoundName} (${validation.qualifiedTeams} teams) → Grand Final`
        : 'Invalid Knockout Structure',
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        teamCount: g.teams.length,
        teamNames: g.teams.map((t) => t.name),
        matchesCount: (g.teams.length * (g.teams.length - 1)) / 2,
      })),
      totalGroupMatches,
      qualificationRule: `Top ${qualPerGroup} from each group`,
      fixturesExist: existingMatchesCount > 0,
      existingMatchesCount,
      isValid: validation.valid,
      validationError: validation.error || null,
      suggestions: validation.suggestions || [],
      minGroupSize: validation.minGroupSize,
      maxGroupSize: validation.maxGroupSize,
    },
  });
});

// POST /api/v1/matches/generate-fixtures — Generate fixtures end-to-end (Group Stage + Knockout)
matchRouter.post('/generate-fixtures', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const {
    tournamentId,
    categoryId,
    confirmRegenerate,
    format: requestedFormat,
    numberOfGroups: reqGroups,
    qualifiersPerGroup: reqQualifiers,
  } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  const existingMatches = await prisma.match.findMany({
    where: { tournamentId, categoryId },
    select: { id: true, status: true },
  });

  if (existingMatches.length > 0 && !confirmRegenerate) {
    res.status(400).json({
      error: 'Fixtures already exist for this tournament/category.',
      fixturesExist: true,
      existingCount: existingMatches.length,
    });
    return;
  }

  const { eligible: participants, categoryType } = await getCategoryEligibility(tournamentId, categoryId);

  if (participants.length < 2) {
    res.status(400).json({
      error: `At least 2 eligible participants are required for ${categoryType?.replace(/_/g, ' ') || 'this category'}. Check that teams have players assigned with correct gender.`,
    });
    return;
  }

  const totalTeams = participants.length;
  const isRoundRobin = requestedFormat === 'ROUND_ROBIN';
  const isGroupStage = requestedFormat === 'GROUP_STAGE' || requestedFormat === 'GROUP_KNOCKOUT';

  let numGroups = reqGroups ? Number(reqGroups) : Math.max(1, Math.ceil(totalTeams / 4));
  let qualPerGroup = reqQualifiers ? Number(reqQualifiers) : 2;

  if (isGroupStage) {
    const valResult = validateGroupKnockoutConfig(totalTeams, numGroups, qualPerGroup);
    if (!valResult.valid) {
      res.status(400).json({
        error: valResult.error,
        validation: valResult,
        suggestions: valResult.suggestions,
      });
      return;
    }
  }

  try {
    const createdMatches = await prisma.$transaction(async (tx) => {
      // Clean up existing matches and standings for this category
      const oldMatchIds = existingMatches.map((m) => m.id);
      if (oldMatchIds.length > 0) {
        await tx.matchEvent.deleteMany({ where: { matchId: { in: oldMatchIds } } });
        await tx.matchGame.deleteMany({ where: { matchId: { in: oldMatchIds } } });
        await tx.match.updateMany({ where: { id: { in: oldMatchIds } }, data: { nextMatchId: null } });
        await tx.match.deleteMany({ where: { id: { in: oldMatchIds } } });
      }

      await tx.standing.deleteMany({ where: { tournamentId, categoryId } });

      if (isRoundRobin) {
        // ── ROUND ROBIN ONLY ──
        for (let pos = 0; pos < participants.length; pos++) {
          const team = participants[pos];
          await tx.standing.create({
            data: {
              tournamentId,
              categoryId,
              teamId: team.type === 'TEAM' ? team.id : null,
              playerId: team.type === 'PLAYER' ? team.id : null,
              groupId: 'round_robin',
              groupName: 'Round Robin',
              groupOrder: 1,
              position: pos + 1,
              played: 0,
              won: 0,
              lost: 0,
              gamesWon: 0,
              gamesLost: 0,
              pointsScored: 0,
              pointsConceded: 0,
              tournamentPoints: 0,
              qualified: false,
              qualificationStatus: 'PENDING',
            },
          });
        }

        const rrMatches = generateNormalRoundRobinMatches(tournamentId, categoryId, participants);
        const createdRRMatches = [];
        for (const mData of rrMatches) {
          const m = await tx.match.create({ data: mData });
          createdRRMatches.push(m);
        }
        return createdRRMatches;
      } else if (isGroupStage) {
        // ── GROUP STAGE + KNOCKOUT ──
        const groups = distributeTeamsIntoGroups(participants, numGroups);
        const matchesToCreate: any[] = [];

        for (const g of groups) {
          for (let pos = 0; pos < g.teams.length; pos++) {
            const team = g.teams[pos];
            await tx.standing.create({
              data: {
                tournamentId,
                categoryId,
                teamId: team.type === 'TEAM' ? team.id : null,
                playerId: team.type === 'PLAYER' ? team.id : null,
                groupId: g.id,
                groupName: g.name,
                groupOrder: g.order,
                position: pos + 1,
                played: 0,
                won: 0,
                lost: 0,
                gamesWon: 0,
                gamesLost: 0,
                pointsScored: 0,
                pointsConceded: 0,
                tournamentPoints: 0,
                qualified: false,
                qualificationStatus: 'PENDING',
              },
            });
          }
        }

        for (const g of groups) {
          const groupMatches = generateGroupRoundRobinMatches(tournamentId, categoryId, g);
          matchesToCreate.push(...groupMatches);
        }

        const createdGroupMatches = [];
        for (const mData of matchesToCreate) {
          const m = await tx.match.create({ data: mData });
          createdGroupMatches.push(m);
        }

        // Build placeholder qualified slots for First Round Knockout Seeding
        const dummyQualified: QualifiedSlot[] = [];
        for (const g of groups) {
          for (let k = 1; k <= qualPerGroup; k++) {
            dummyQualified.push({
              groupId: g.id,
              groupName: g.name,
              groupOrder: g.order,
              position: k,
              name: `Qualified ${g.name} #${k}`,
              type: 'PLAYER',
            });
          }
        }

        const seededPairs = seedKnockoutFirstRound(dummyQualified, groups.length, qualPerGroup);
        const createdKnockoutMatches = await createKnockoutMatchesInTx(tx, tournamentId, categoryId, seededPairs);

        return [...createdGroupMatches, ...createdKnockoutMatches];
      } else {
        // ── KNOCKOUT ONLY ──
        const targetBracket = getNextPowerOfTwo(totalTeams);
        const preliminaryMatches = totalTeams === targetBracket ? 0 : totalTeams - targetBracket / 2;
        const preliminaryParticipants = preliminaryMatches * 2;
        const directQualifiers = totalTeams - preliminaryParticipants;

        if (
          preliminaryParticipants + directQualifiers !== totalTeams ||
          preliminaryMatches + directQualifiers !== targetBracket / 2
        ) {
          throw new Error(`Invalid knockout bracket calculation for ${totalTeams} teams.`);
        }

        if (preliminaryMatches === 0) {
          // Power-of-two team count
          const dummyPairs: { sideA: Participant; sideB: Participant }[] = [];
          for (let i = 0; i < participants.length; i += 2) {
            dummyPairs.push({
              sideA: participants[i],
              sideB: participants[i + 1] || { id: 'TBD', name: 'TBD', type: 'PLAYER' },
            });
          }
          const createdKnockoutMatches = await createKnockoutMatchesInTx(tx, tournamentId, categoryId, dummyPairs);
          return createdKnockoutMatches;
        } else {
          // Non-power-of-two team count with Preliminary Round
          const mainBracketTeamsCount = targetBracket / 2;
          const directTeams = participants.slice(0, directQualifiers);
          const prelimTeams = participants.slice(directQualifiers);

          // Build seededPairs for Round 1 of Main Bracket
          const mainSeededPairs: { sideA: Participant; sideB: Participant }[] = [];
          const numRound1Matches = mainBracketTeamsCount / 2;

          for (let m = 0; m < numRound1Matches; m++) {
            const slotAIdx = m * 2;
            const slotBIdx = m * 2 + 1;

            const sideA =
              slotAIdx < directQualifiers
                ? directTeams[slotAIdx]
                : {
                    id: 'TBD',
                    name: `Winner Preliminary Match ${slotAIdx - directQualifiers + 1}`,
                    type: 'PLAYER' as const,
                  };

            const sideB =
              slotBIdx < directQualifiers
                ? directTeams[slotBIdx]
                : {
                    id: 'TBD',
                    name: `Winner Preliminary Match ${slotBIdx - directQualifiers + 1}`,
                    type: 'PLAYER' as const,
                  };

            mainSeededPairs.push({ sideA, sideB });
          }

          // Generate Main Bracket matches
          const createdMainMatches = await createKnockoutMatchesInTx(tx, tournamentId, categoryId, mainSeededPairs);

          // Get Round 1 Main Bracket matches sorted by matchNumber
          const round1MainMatches = createdMainMatches
            .filter((m) => m.roundNumber === 1)
            .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

          // Generate Preliminary Round matches
          const createdPrelimMatches: any[] = [];
          for (let p = 0; p < preliminaryMatches; p++) {
            const teamA = prelimTeams[p];
            const teamB = prelimTeams[prelimTeams.length - 1 - p];

            const slotIndex = directQualifiers + p;
            const mainMatchIndex = Math.floor(slotIndex / 2);
            const mainMatchSlot = slotIndex % 2 === 0 ? 'A' : 'B';
            const targetMainMatch = round1MainMatches[mainMatchIndex];

            const prelimMatchData = {
              tournamentId: String(tournamentId),
              categoryId: String(categoryId),
              stage: 'KNOCKOUT',
              round: 'Preliminary Round',
              roundNumber: 0,
              matchNumber: p + 1,
              bracketPosition: p + 1,
              sideAType: teamA.type,
              sideAId: teamA.id,
              sideAName: teamA.name,
              sideBType: teamB.type,
              sideBId: teamB.id,
              sideBName: teamB.name,
              status: 'SCHEDULED' as const,
              nextMatchId: targetMainMatch ? targetMainMatch.id : null,
              nextMatchSlot: mainMatchSlot,
            };

            const created = await tx.match.create({ data: prelimMatchData });
            createdPrelimMatches.push(created);
          }

          return [...createdPrelimMatches, ...createdMainMatches];
        }
      }
    });

    const finalFormat = isRoundRobin ? 'ROUND_ROBIN' : isGroupStage ? 'GROUP_KNOCKOUT' : 'KNOCKOUT';

    await logAudit({
      userId: req.user?.id,
      action: 'FIXTURE_CHANGED',
      entity: 'Match',
      metadata: { tournamentId, categoryId, totalTeams, format: finalFormat },
    });

    res.status(201).json({
      message: `Fixtures generated successfully for ${totalTeams} teams.`,
      format: finalFormat,
      count: createdMatches.length,
    });
  } catch (err: any) {
    console.error('[Generate Fixtures Error]', err);
    res.status(500).json({ error: 'Failed to generate fixtures', details: err.message });
  }
});


