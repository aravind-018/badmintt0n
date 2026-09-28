import { prisma } from '@badminton-live/database';
import { isPowerOfTwo, getKnockoutRoundName } from '@badminton-live/shared';

export interface Participant {
  id: string;
  name: string;
  type: 'TEAM' | 'PLAYER';
}

export interface GroupDistribution {
  id: string;
  name: string;
  order: number;
  teams: Participant[];
}

export interface QualifiedSlot {
  groupId: string;
  groupName: string;
  groupOrder: number;
  position: number;
  teamId?: string | null;
  playerId?: string | null;
  name: string;
  type: 'TEAM' | 'PLAYER';
}

/**
 * Calculates group sizes and distributes participants evenly across groups.
 * Ensures difference between largest and smallest group is <= 1.
 */
export function distributeTeamsIntoGroups(
  participants: Participant[],
  requestedNumGroups?: number
): GroupDistribution[] {
  const total = participants.length;
  if (total === 0) return [];

  const numberOfGroups =
    requestedNumGroups && requestedNumGroups > 0
      ? requestedNumGroups
      : Math.max(1, Math.ceil(total / 4));

  const baseSize = Math.floor(total / numberOfGroups);
  const remainder = total % numberOfGroups;

  const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const groups: GroupDistribution[] = [];

  let participantIndex = 0;
  for (let g = 0; g < numberOfGroups; g++) {
    const groupName = `Group ${groupLetters[g] || g + 1}`;
    const groupSize = baseSize + (g < remainder ? 1 : 0);

    const groupTeams = participants.slice(participantIndex, participantIndex + groupSize);
    participantIndex += groupSize;

    groups.push({
      id: `group_${groupLetters[g]?.toLowerCase() || g + 1}`,
      name: groupName,
      order: g + 1,
      teams: groupTeams,
    });
  }

  return groups;
}

/**
 * Generates Round Robin matches for a list of participants within a single group.
 * Matches per group = n * (n - 1) / 2
 */
export function generateGroupRoundRobinMatches(
  tournamentId: string,
  categoryId: string,
  group: GroupDistribution
) {
  const teams = group.teams;
  const matches: any[] = [];

  let matchNum = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournamentId,
        categoryId,
        stage: 'GROUP_STAGE',
        groupId: group.id,
        groupName: group.name,
        groupOrder: group.order,
        round: `${group.name} - Match ${matchNum}`,
        roundNumber: 1,
        matchNumber: matchNum,
        sideAType: teams[i].type,
        sideAId: teams[i].id,
        sideAName: teams[i].name,
        sideBType: teams[j].type,
        sideBId: teams[j].id,
        sideBName: teams[j].name,
        status: 'SCHEDULED',
      });
      matchNum++;
    }
  }

  return matches;
}

/**
 * Generates Normal Round Robin matches for ALL participants in a single pool.
 * Total matches = n * (n - 1) / 2
 */
export function generateNormalRoundRobinMatches(
  tournamentId: string,
  categoryId: string,
  participants: Participant[]
) {
  const matches: any[] = [];
  let matchNum = 1;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        tournamentId,
        categoryId,
        stage: 'ROUND_ROBIN',
        groupId: 'round_robin',
        groupName: 'Round Robin',
        groupOrder: 1,
        round: `Round Robin - Match ${matchNum}`,
        roundNumber: 1,
        matchNumber: matchNum,
        sideAType: participants[i].type,
        sideAId: participants[i].id,
        sideAName: participants[i].name,
        sideBType: participants[j].type,
        sideBId: participants[j].id,
        sideBName: participants[j].name,
        status: 'SCHEDULED',
      });
      matchNum++;
    }
  }

  return matches;
}

/**
 * Deterministic Seeding algorithm for First Round Knockout.
 * Goals:
 * 1. Every qualified team appears exactly once.
 * 2. No teams from the same group play each other in the first knockout round.
 * 3. Group winners paired against runners-up / lower positions from other groups.
 * 4. Keep teams from the same group in different sides of the bracket where practical.
 */
export function seedKnockoutFirstRound(
  qualified: QualifiedSlot[],
  numberOfGroups: number,
  qualifiersPerGroup: number
): { sideA: QualifiedSlot; sideB: QualifiedSlot }[] {
  const total = qualified.length;
  if (total === 0 || total % 2 !== 0) return [];

  const G = numberOfGroups;
  const Q = qualifiersPerGroup;
  const halfG = Math.max(1, Math.floor(G / 2));

  const grid: QualifiedSlot[][] = Array.from({ length: G }, () => []);
  for (const q of qualified) {
    const gIdx = q.groupOrder - 1;
    const pIdx = q.position - 1;
    if (gIdx >= 0 && gIdx < G && pIdx >= 0 && pIdx < Q) {
      grid[gIdx][pIdx] = q;
    }
  }

  const matches: { sideA: QualifiedSlot; sideB: QualifiedSlot }[] = [];
  const pairedSet = new Set<string>();

  // Pair top rank (p) against bottom rank (Q - 1 - p) offset by halfG groups
  for (let p = 0; p < Math.floor(Q / 2); p++) {
    const oppositeP = Q - 1 - p;
    for (let g = 0; g < G; g++) {
      const gOpposite = (g + halfG) % G;
      const teamA = grid[g]?.[p];
      const teamB = grid[gOpposite]?.[oppositeP];
      if (teamA && teamB) {
        matches.push({ sideA: teamA, sideB: teamB });
        pairedSet.add(`${g}-${p}`);
        pairedSet.add(`${gOpposite}-${oppositeP}`);
      }
    }
  }

  // If Q is odd (e.g. Q = 1 or Q = 3), pair middle rank
  if (Q % 2 !== 0) {
    const midP = Math.floor(Q / 2);
    for (let g = 0; g < Math.floor(G / 2); g++) {
      const gOpposite = g + Math.ceil(G / 2);
      const teamA = grid[g]?.[midP];
      const teamB = grid[gOpposite]?.[midP];
      if (teamA && teamB) {
        matches.push({ sideA: teamA, sideB: teamB });
        pairedSet.add(`${g}-${midP}`);
        pairedSet.add(`${gOpposite}-${midP}`);
      }
    }
  }

  // Fallback for remaining slots to ensure complete coverage
  const remaining: QualifiedSlot[] = [];
  for (let g = 0; g < G; g++) {
    for (let p = 0; p < Q; p++) {
      if (!pairedSet.has(`${g}-${p}`) && grid[g]?.[p]) {
        remaining.push(grid[g][p]);
      }
    }
  }
  for (let i = 0; i < remaining.length; i += 2) {
    if (remaining[i] && remaining[i + 1]) {
      matches.push({ sideA: remaining[i], sideB: remaining[i + 1] });
    }
  }

  return matches;
}

/**
 * Validates knockout bracket seeding integrity.
 */
export function validateKnockoutSeeding(
  qualifiedTeams: QualifiedSlot[],
  firstRoundPairs: { sideA: QualifiedSlot; sideB: QualifiedSlot }[]
): { valid: boolean; error?: string } {
  const knockoutSize = qualifiedTeams.length;

  if (!isPowerOfTwo(knockoutSize)) {
    return { valid: false, error: `Knockout size must be a power of 2, received ${knockoutSize}.` };
  }

  if (firstRoundPairs.length !== knockoutSize / 2) {
    return {
      valid: false,
      error: `First round matches (${firstRoundPairs.length}) must equal knockoutSize / 2 (${knockoutSize / 2}).`,
    };
  }

  const qualifiedIds = new Set(qualifiedTeams.map((t) => t.teamId || t.playerId || t.name));
  const seenInBracket = new Map<string, number>();

  for (const pair of firstRoundPairs) {
    const keyA = pair.sideA.teamId || pair.sideA.playerId || pair.sideA.name;
    const keyB = pair.sideB.teamId || pair.sideB.playerId || pair.sideB.name;

    if (!keyA.startsWith('TBD')) {
      if (!qualifiedIds.has(keyA)) {
        return { valid: false, error: `Unqualified participant '${pair.sideA.name}' found in bracket.` };
      }
      seenInBracket.set(keyA, (seenInBracket.get(keyA) || 0) + 1);
    }

    if (!keyB.startsWith('TBD')) {
      if (!qualifiedIds.has(keyB)) {
        return { valid: false, error: `Unqualified participant '${pair.sideB.name}' found in bracket.` };
      }
      seenInBracket.set(keyB, (seenInBracket.get(keyB) || 0) + 1);
    }
  }

  const isPlaceholder = qualifiedTeams.every((t) => (t.teamId || t.name).includes('TBD') || t.name.startsWith('Qualified Group'));
  if (!isPlaceholder) {
    for (const team of qualifiedTeams) {
      const key = team.teamId || team.playerId || team.name;
      const count = seenInBracket.get(key) || 0;
      if (count === 0) {
        return { valid: false, error: `Qualified team '${team.name}' is missing from the knockout bracket.` };
      }
      if (count > 1) {
        return { valid: false, error: `Duplicate team '${team.name}' found in the knockout bracket.` };
      }
    }
  }

  return { valid: true };
}

/**
 * Generates and saves a linked power-of-2 knockout bracket tree inside a Prisma transaction.
 * Supports any power of 2: 2, 4, 8, 16, 32, 64, 128...
 */
export async function createKnockoutMatchesInTx(
  tx: any,
  tournamentId: string,
  categoryId: string,
  seededPairs: { sideA: { id?: string | null; name: string; type: 'TEAM' | 'PLAYER' }; sideB: { id?: string | null; name: string; type: 'TEAM' | 'PLAYER' } }[]
): Promise<any[]> {
  const numFirstRoundMatches = seededPairs.length;
  if (numFirstRoundMatches === 0) return [];

  const knockoutSize = numFirstRoundMatches * 2;
  if (!isPowerOfTwo(knockoutSize)) {
    throw new Error(`Knockout size must be a power of 2, received ${knockoutSize}`);
  }

  const numRounds = Math.log2(knockoutSize);
  const createdMatches: any[] = [];
  const matchesByRound: Record<number, any[]> = {};

  // Build rounds from Final (numRounds) down to Round 1
  for (let r = numRounds; r >= 1; r--) {
    const matchesInRoundCount = Math.pow(2, numRounds - r);
    const roundName = getKnockoutRoundName(Math.pow(2, numRounds - r + 1));
    matchesByRound[r] = [];

    for (let m = 1; m <= matchesInRoundCount; m++) {
      let nextMatchId: string | null = null;
      let nextMatchSlot: string | null = null;

      if (r < numRounds) {
        const parentMatchIndex = Math.ceil(m / 2) - 1;
        const parentMatch = matchesByRound[r + 1][parentMatchIndex];
        if (parentMatch) {
          nextMatchId = parentMatch.id;
          nextMatchSlot = m % 2 === 1 ? 'A' : 'B';
        }
      }

      let sideA: { id: string; name: string; type: 'TEAM' | 'PLAYER' } = { id: 'TBD', name: 'TBD', type: 'PLAYER' };
      let sideB: { id: string; name: string; type: 'TEAM' | 'PLAYER' } = { id: 'TBD', name: 'TBD', type: 'PLAYER' };

      if (r === 1) {
        const pair = seededPairs[m - 1];
        if (pair) {
          sideA = { id: pair.sideA.id || 'TBD', name: pair.sideA.name || 'TBD', type: pair.sideA.type };
          sideB = { id: pair.sideB.id || 'TBD', name: pair.sideB.name || 'TBD', type: pair.sideB.type };
        }
      }

      const matchData = {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: roundName,
        roundNumber: r,
        matchNumber: m,
        bracketPosition: m,
        sideAType: sideA.type,
        sideAId: sideA.id,
        sideAName: sideA.name,
        sideBType: sideB.type,
        sideBId: sideB.id,
        sideBName: sideB.name,
        status: 'SCHEDULED',
        nextMatchId,
        nextMatchSlot,
      };

      const created = await tx.match.create({ data: matchData });
      matchesByRound[r].push(created);
      createdMatches.push(created);
    }
  }

  return createdMatches;
}

/**
 * Recalculate group standings and qualification status for a tournament category.
 */
export async function updateGroupStandingsAndQualification(
  tournamentId: string,
  categoryId: string,
  overrideQualifiersPerGroup?: number
) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  const topN = overrideQualifiersPerGroup || (category?.qualificationRule === 'TOP_1' ? 1 : 2);

  const matches = await prisma.match.findMany({
    where: { tournamentId, categoryId, stage: { in: ['GROUP_STAGE', 'ROUND_ROBIN'] } },
    include: { games: true },
  });

  const existingStandings = await prisma.standing.findMany({
    where: { tournamentId, categoryId },
  });

  const groupStatsMap = new Map<string, Map<string, any>>();

  for (const s of existingStandings) {
    if (!s.groupId) continue;
    if (!groupStatsMap.has(s.groupId)) groupStatsMap.set(s.groupId, new Map());
    const tId = s.teamId || s.playerId;
    if (tId) {
      groupStatsMap.get(s.groupId)!.set(tId, {
        id: s.id,
        groupId: s.groupId,
        groupName: s.groupName,
        groupOrder: s.groupOrder,
        teamId: s.teamId,
        playerId: s.playerId,
        played: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsScored: 0,
        pointsConceded: 0,
        tournamentPoints: 0,
      });
    }
  }

  let totalMatches = matches.length;
  let completedMatches = 0;

  for (const m of matches) {
    const isFinished = m.status === 'COMPLETED' || m.status === 'WALKOVER' || m.status === 'RETIRED';
    if (isFinished) completedMatches++;

    if (!m.groupId) continue;
    if (!groupStatsMap.has(m.groupId)) groupStatsMap.set(m.groupId, new Map());
    const gMap = groupStatsMap.get(m.groupId)!;

    if (m.sideAId && m.sideAId !== 'TBD' && !gMap.has(m.sideAId)) {
      gMap.set(m.sideAId, {
        groupId: m.groupId,
        groupName: m.groupName,
        groupOrder: m.groupOrder,
        teamId: m.sideAType === 'TEAM' ? m.sideAId : null,
        playerId: m.sideAType === 'PLAYER' ? m.sideAId : null,
        played: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsScored: 0,
        pointsConceded: 0,
        tournamentPoints: 0,
      });
    }

    if (m.sideBId && m.sideBId !== 'TBD' && !gMap.has(m.sideBId)) {
      gMap.set(m.sideBId, {
        groupId: m.groupId,
        groupName: m.groupName,
        groupOrder: m.groupOrder,
        teamId: m.sideBType === 'TEAM' ? m.sideBId : null,
        playerId: m.sideBType === 'PLAYER' ? m.sideBId : null,
        played: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsScored: 0,
        pointsConceded: 0,
        tournamentPoints: 0,
      });
    }

    if (isFinished && m.sideAId && m.sideBId) {
      const statsA = gMap.get(m.sideAId);
      const statsB = gMap.get(m.sideBId);

      if (statsA && statsB) {
        statsA.played += 1;
        statsB.played += 1;

        let aGamesWon = 0;
        let bGamesWon = 0;
        let aPointsScored = 0;
        let bPointsScored = 0;

        for (const g of m.games) {
          aPointsScored += g.sideAPoints;
          bPointsScored += g.sideBPoints;
          if (g.sideAPoints > g.sideBPoints) aGamesWon++;
          else if (g.sideBPoints > g.sideAPoints) bGamesWon++;
        }

        statsA.gamesWon += aGamesWon;
        statsA.gamesLost += bGamesWon;
        statsA.pointsScored += aPointsScored;
        statsA.pointsConceded += bPointsScored;

        statsB.gamesWon += bGamesWon;
        statsB.gamesLost += aGamesWon;
        statsB.pointsScored += bPointsScored;
        statsB.pointsConceded += aPointsScored;

        if (m.winnerId === m.sideAId) {
          statsA.won += 1;
          statsA.tournamentPoints += 2;
          statsB.lost += 1;
        } else if (m.winnerId === m.sideBId) {
          statsB.won += 1;
          statsB.tournamentPoints += 2;
          statsA.lost += 1;
        }
      }
    }
  }

  const isGroupStageComplete = totalMatches > 0 && completedMatches === totalMatches;

  // Persist standings updates
  for (const [groupId, gMap] of groupStatsMap.entries()) {
    const list = Array.from(gMap.values()).sort((a, b) => {
      if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
      const diffA = a.gamesWon - a.gamesLost;
      const diffB = b.gamesWon - b.gamesLost;
      if (diffB !== diffA) return diffB - diffA;
      const ptsDiffA = a.pointsScored - a.pointsConceded;
      const ptsDiffB = b.pointsScored - b.pointsConceded;
      if (ptsDiffB !== ptsDiffA) return ptsDiffB - ptsDiffA;
      return b.gamesWon - a.gamesWon;
    });

    for (let pos = 0; pos < list.length; pos++) {
      const item = list[pos];
      const position = pos + 1;

      let qualified = false;
      let qualificationStatus = 'PENDING';

      if (isGroupStageComplete) {
        if (position <= topN) {
          qualified = true;
          qualificationStatus = 'QUALIFIED';
        } else {
          qualified = false;
          qualificationStatus = 'ELIMINATED';
        }
      }

      if (item.id) {
        await prisma.standing.update({
          where: { id: item.id },
          data: {
            position,
            played: item.played,
            won: item.won,
            lost: item.lost,
            gamesWon: item.gamesWon,
            gamesLost: item.gamesLost,
            pointsScored: item.pointsScored,
            pointsConceded: item.pointsConceded,
            tournamentPoints: item.tournamentPoints,
            qualified,
            qualificationStatus,
            qualificationPosition: position,
          },
        });
      } else {
        await prisma.standing.create({
          data: {
            tournamentId,
            categoryId,
            teamId: item.teamId,
            playerId: item.playerId,
            groupId: item.groupId,
            groupName: item.groupName,
            groupOrder: item.groupOrder,
            position,
            played: item.played,
            won: item.won,
            lost: item.lost,
            gamesWon: item.gamesWon,
            gamesLost: item.gamesLost,
            pointsScored: item.pointsScored,
            pointsConceded: item.pointsConceded,
            tournamentPoints: item.tournamentPoints,
            qualified,
            qualificationStatus,
            qualificationPosition: position,
          },
        });
      }
    }
  }

  // Advance qualified teams into knockout round 1 fixtures upon group completion
  if (isGroupStageComplete) {
    try {
      const qualifiedStandings = await prisma.standing.findMany({
        where: {
          tournamentId,
          categoryId,
          qualified: true,
        },
        include: {
          team: { select: { id: true, name: true } },
        },
        orderBy: [{ groupOrder: 'asc' }, { position: 'asc' }],
      });

      const numberOfGroups = groupStatsMap.size;
      const qualifiedSlots: QualifiedSlot[] = [];

      for (const s of qualifiedStandings) {
        const pId = s.teamId || s.playerId;
        let pName = s.team?.name;
        if (!pName && s.playerId) {
          const pl = await prisma.player.findUnique({ where: { id: s.playerId }, select: { name: true } });
          pName = pl?.name;
        }

        if (pId && pName) {
          qualifiedSlots.push({
            groupId: s.groupId || '',
            groupName: s.groupName || '',
            groupOrder: s.groupOrder || 1,
            position: s.position,
            teamId: s.teamId,
            playerId: s.playerId,
            name: pName,
            type: s.teamId ? 'TEAM' : 'PLAYER',
          });
        }
      }

      if (qualifiedSlots.length > 0 && numberOfGroups > 0) {
        const qualifiersPerGroup = Math.floor(qualifiedSlots.length / numberOfGroups);
        const seededMatches = seedKnockoutFirstRound(qualifiedSlots, numberOfGroups, qualifiersPerGroup);

        const firstRoundKnockoutMatches = await prisma.match.findMany({
          where: {
            tournamentId,
            categoryId,
            stage: 'KNOCKOUT',
            roundNumber: 1,
          },
          orderBy: { matchNumber: 'asc' },
        });

        for (let idx = 0; idx < seededMatches.length; idx++) {
          const matchObj = firstRoundKnockoutMatches[idx];
          const seeded = seededMatches[idx];

          if (matchObj && seeded) {
            await prisma.match.update({
              where: { id: matchObj.id },
              data: {
                sideAId: seeded.sideA.teamId || seeded.sideA.playerId || 'TBD',
                sideAName: seeded.sideA.name,
                sideAType: seeded.sideA.type,
                sideBId: seeded.sideB.teamId || seeded.sideB.playerId || 'TBD',
                sideBName: seeded.sideB.name,
                sideBType: seeded.sideB.type,
              },
            });
          }
        }
      }
    } catch (bracketErr) {
      console.error('[Bracket Qualification Error] Failed to seed knockout matches:', bracketErr);
    }
  }

  return {
    totalMatches,
    completedMatches,
    isGroupStageComplete,
  };
}
