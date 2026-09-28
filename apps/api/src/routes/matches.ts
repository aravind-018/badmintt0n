import { Router, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { advanceBracketWinner } from '../utils/bracket';
import { z } from 'zod';
import {
  distributeTeamsIntoGroups,
  generateGroupRoundRobinMatches,
  generateNormalRoundRobinMatches,
  createKnockoutMatchesInTx,
  updateGroupStandingsAndQualification,
  Participant,
} from '../utils/fixtureGenerator';
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


// POST /api/v1/matches/preview-fixtures — Preview fixture generation details before confirming
matchRouter.post('/preview-fixtures', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId, format: requestedFormat } = req.body;

  if (!tournamentId || !categoryId) {
    res.status(400).json({ error: 'Tournament ID and Category ID are required' });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });

  // Use eligibility-aware function — only eligible participants are used
  const { eligible: participants, excluded, categoryType } = await getCategoryEligibility(tournamentId, categoryId);
  const totalTeams = participants.length;

  const existingMatchesCount = await prisma.match.count({
    where: { tournamentId, categoryId },
  });

  // Determine format to preview
  const format: string = requestedFormat || (totalTeams >= 6 ? 'GROUP_KNOCKOUT' : 'KNOCKOUT');

  if (format === 'ROUND_ROBIN') {
    const totalMatches = (totalTeams * (totalTeams - 1)) / 2;
    res.json({
      preview: {
        tournamentFormat: 'ROUND_ROBIN',
        categoryType,
        isGroupStageEligible: false,
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
      },
    });
    return;
  }

  const isGroupStageEligible = totalTeams >= 6;

  if ((format === 'GROUP_STAGE' || format === 'GROUP_KNOCKOUT') && !isGroupStageEligible) {
    res.status(400).json({ error: `Group Round Robin + Knockout requires at least 6 eligible teams. Only ${totalTeams} found for this category.` });
    return;
  }

  const isGroupStage = format === 'GROUP_STAGE' || format === 'GROUP_KNOCKOUT';
  const groups = isGroupStage ? distributeTeamsIntoGroups(participants) : [];

  let totalGroupMatches = 0;
  groups.forEach((g) => {
    totalGroupMatches += (g.teams.length * (g.teams.length - 1)) / 2;
  });

  const topN = category?.qualificationRule === 'TOP_1' ? 1 : 2;
  const expectedQualified = groups.length * topN;

  res.json({
    preview: {
      tournamentFormat: format,
      categoryType,
      isGroupStageEligible,
      groupStageRequirementMessage: !isGroupStageEligible ? 'Group Round Robin + Knockout requires a minimum of 6 eligible teams.' : null,
      totalTeams,
      totalEligible: totalTeams,
      totalExcluded: excluded.length,
      numberOfGroups: groups.length,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        teamCount: g.teams.length,
        teamNames: g.teams.map((t) => t.name),
        matchesCount: (g.teams.length * (g.teams.length - 1)) / 2,
      })),
      totalGroupMatches,
      qualificationRule: isGroupStage ? `Top ${topN} from each group` : 'N/A (Knockout)',
      expectedQualified: isGroupStage ? expectedQualified : totalTeams,
      knockoutStructure: isGroupStage
        ? expectedQualified === 8
          ? 'Quarter Finals (8 teams) → Semi Finals → Grand Final'
          : expectedQualified === 6
          ? 'Quarter Finals (6 teams) → Semi Finals → Grand Final'
          : expectedQualified === 4
          ? 'Semi Finals (4 teams) → Grand Final'
          : 'Knockout Bracket'
        : totalTeams >= 4
        ? 'Semi Finals → Grand Final'
        : totalTeams >= 2
        ? 'Grand Final'
        : 'Knockout Bracket',
      fixturesExist: existingMatchesCount > 0,
      existingMatchesCount,
    },
  });
});


// POST /api/v1/matches/generate-fixtures — Generate fixtures end-to-end (Group Stage + Knockout)
matchRouter.post('/generate-fixtures', authenticateToken, requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { tournamentId, categoryId, confirmRegenerate, format: requestedFormat } = req.body;

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

  // SERVER-SIDE ELIGIBILITY: independently determine eligible participants by category type.
  // This cannot be bypassed by the frontend — the backend always filters by gender/category.
  const { eligible: participants, categoryType } = await getCategoryEligibility(tournamentId, categoryId);

  if (participants.length < 2) {
    res.status(400).json({ error: `At least 2 eligible participants are required for ${categoryType?.replace(/_/g, ' ') || 'this category'}. Check that teams have players assigned with the correct gender.` });
    return;
  }

  const totalTeams = participants.length;

  // Validation: If user attempts to force group stage with < 6 eligible teams, reject
  if ((requestedFormat === 'GROUP_STAGE' || requestedFormat === 'GROUP_KNOCKOUT') && totalTeams < 6) {
    res.status(400).json({ error: `Group Round Robin + Knockout requires at least 6 eligible teams. Only ${totalTeams} found for ${categoryType?.replace(/_/g, ' ')}.` });
    return;
  }

  const isRoundRobin = requestedFormat === 'ROUND_ROBIN';
  const isGroupStage = !isRoundRobin && (
    requestedFormat
      ? (requestedFormat === 'GROUP_STAGE' || requestedFormat === 'GROUP_KNOCKOUT')
      : (totalTeams >= 6)
  );

  if (isGroupStage && totalTeams < 6) {
    res.status(400).json({ error: 'Group Stage requires at least 6 teams.' });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });

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
        // ── NORMAL ROUND ROBIN ── All teams in one pool, no knockout
        // Create Standing record for every participant
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
        // ── GROUP STAGE (>= 6 teams, max 3 per group) ──
        const groups = distributeTeamsIntoGroups(participants);
        const matchesToCreate: any[] = [];

        // Create initial Standing records for every participant in their group
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

        // Generate group stage round-robin matches
        for (const g of groups) {
          const groupMatches = generateGroupRoundRobinMatches(tournamentId, categoryId, g);
          matchesToCreate.push(...groupMatches);
        }

        // Insert group stage matches
        const createdGroupMatches = [];
        for (const mData of matchesToCreate) {
          const m = await tx.match.create({ data: mData });
          createdGroupMatches.push(m);
        }

        // Create draft Knockout Bracket structure
        const dummyQualified: Participant[] = [];
        const topN = category?.qualificationRule === 'TOP_1' ? 1 : 2;
        groups.forEach((g) => {
          for (let k = 0; k < topN; k++) {
            dummyQualified.push({
              id: 'TBD',
              name: `Qualified ${g.name} #${k + 1}`,
              type: 'PLAYER',
            });
          }
        });

        const createdKnockoutMatches = await createKnockoutMatchesInTx(tx, tournamentId, categoryId, dummyQualified);

        return [...createdGroupMatches, ...createdKnockoutMatches];

      } else {
        // ── COMPLETE KNOCKOUT ── Direct knockout bracket with all teams
        const createdKnockoutMatches = await createKnockoutMatchesInTx(tx, tournamentId, categoryId, participants);
        return createdKnockoutMatches;
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


