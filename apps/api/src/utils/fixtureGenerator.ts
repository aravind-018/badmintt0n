import { prisma } from '@badminton-live/database';

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

/**
 * Calculates group sizes and distributes participants evenly.
 * Maximum group size = 3.
 * numberOfGroups = Math.ceil(totalTeams / 3)
 */
export function distributeTeamsIntoGroups(participants: Participant[]): GroupDistribution[] {
  const total = participants.length;
  if (total === 0) return [];

  const numberOfGroups = Math.ceil(total / 3);
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
 * Every participant plays every other participant exactly once.
 * No groups, no knockout — pure league format.
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
 * Generates and saves a linked knockout bracket tree inside a Prisma transaction for any team count.
 */
export async function createKnockoutMatchesInTx(
  tx: any,
  tournamentId: string,
  categoryId: string,
  qualifiedTeams: Participant[]
): Promise<any[]> {
  const count = qualifiedTeams.length;
  if (count < 2) return [];

  const p = qualifiedTeams;

  if (count === 2) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'Qualified 1',
        sideBType: p[1]?.type || 'TEAM',
        sideBId: p[1]?.id || 'TBD',
        sideBName: p[1]?.name || 'Qualified 2',
        status: 'SCHEDULED',
      },
    });
    return [finalMatch];
  }

  if (count === 3) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 2,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: p[2]?.type || 'TEAM',
        sideBId: p[2]?.id || 'TBD',
        sideBName: p[2]?.name || 'TBD',
        status: 'SCHEDULED',
      },
    });

    const sf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'TBD',
        sideBType: p[1]?.type || 'TEAM',
        sideBId: p[1]?.id || 'TBD',
        sideBName: p[1]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'A',
      },
    });

    return [finalMatch, sf1];
  }

  if (count === 4) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 2,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
      },
    });

    const sf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'TBD',
        sideBType: p[3]?.type || 'TEAM',
        sideBId: p[3]?.id || 'TBD',
        sideBName: p[3]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'A',
      },
    });

    const sf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 1,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: p[1]?.type || 'TEAM',
        sideAId: p[1]?.id || 'TBD',
        sideAName: p[1]?.name || 'TBD',
        sideBType: p[2]?.type || 'TEAM',
        sideBId: p[2]?.id || 'TBD',
        sideBName: p[2]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'B',
      },
    });

    return [finalMatch, sf1, sf2];
  }

  if (count === 5) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 3,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
      },
    });

    const sf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'A',
      },
    });

    const sf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: p[1]?.type || 'TEAM',
        sideAId: p[1]?.id || 'TBD',
        sideAName: p[1]?.name || 'TBD',
        sideBType: p[2]?.type || 'TEAM',
        sideBId: p[2]?.id || 'TBD',
        sideBName: p[2]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'B',
      },
    });

    const qf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[3]?.type || 'TEAM',
        sideAId: p[3]?.id || 'TBD',
        sideAName: p[3]?.name || 'TBD',
        sideBType: p[4]?.type || 'TEAM',
        sideBId: p[4]?.id || 'TBD',
        sideBName: p[4]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf1.id,
        nextMatchSlot: 'B',
      },
    });

    return [finalMatch, sf1, sf2, qf1];
  }

  if (count === 6) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 3,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
      },
    });

    const sf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'A',
      },
    });

    const sf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: p[1]?.type || 'TEAM',
        sideAId: p[1]?.id || 'TBD',
        sideAName: p[1]?.name || 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'B',
      },
    });

    const qf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[2]?.type || 'TEAM',
        sideAId: p[2]?.id || 'TBD',
        sideAName: p[2]?.name || 'TBD',
        sideBType: p[5]?.type || 'TEAM',
        sideBId: p[5]?.id || 'TBD',
        sideBName: p[5]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf1.id,
        nextMatchSlot: 'B',
      },
    });

    const qf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: p[3]?.type || 'TEAM',
        sideAId: p[3]?.id || 'TBD',
        sideAName: p[3]?.name || 'TBD',
        sideBType: p[4]?.type || 'TEAM',
        sideBId: p[4]?.id || 'TBD',
        sideBName: p[4]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf2.id,
        nextMatchSlot: 'B',
      },
    });

    return [finalMatch, sf1, sf2, qf1, qf2];
  }

  if (count === 7) {
    const finalMatch = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Grand Final',
        roundNumber: 3,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
      },
    });

    const sf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[0]?.type || 'TEAM',
        sideAId: p[0]?.id || 'TBD',
        sideAName: p[0]?.name || 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'A',
      },
    });

    const sf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Semi Finals',
        roundNumber: 2,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: 'PLAYER',
        sideAId: 'TBD',
        sideAName: 'TBD',
        sideBType: 'PLAYER',
        sideBId: 'TBD',
        sideBName: 'TBD',
        status: 'SCHEDULED',
        nextMatchId: finalMatch.id,
        nextMatchSlot: 'B',
      },
    });

    const qf1 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 1,
        bracketPosition: 1,
        sideAType: p[1]?.type || 'TEAM',
        sideAId: p[1]?.id || 'TBD',
        sideAName: p[1]?.name || 'TBD',
        sideBType: p[6]?.type || 'TEAM',
        sideBId: p[6]?.id || 'TBD',
        sideBName: p[6]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf1.id,
        nextMatchSlot: 'B',
      },
    });

    const qf2 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 2,
        bracketPosition: 2,
        sideAType: p[2]?.type || 'TEAM',
        sideAId: p[2]?.id || 'TBD',
        sideAName: p[2]?.name || 'TBD',
        sideBType: p[5]?.type || 'TEAM',
        sideBId: p[5]?.id || 'TBD',
        sideBName: p[5]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf2.id,
        nextMatchSlot: 'A',
      },
    });

    const qf3 = await tx.match.create({
      data: {
        tournamentId,
        categoryId,
        stage: 'KNOCKOUT',
        round: 'Quarter Finals',
        roundNumber: 1,
        matchNumber: 3,
        bracketPosition: 3,
        sideAType: p[3]?.type || 'TEAM',
        sideAId: p[3]?.id || 'TBD',
        sideAName: p[3]?.name || 'TBD',
        sideBType: p[4]?.type || 'TEAM',
        sideBId: p[4]?.id || 'TBD',
        sideBName: p[4]?.name || 'TBD',
        status: 'SCHEDULED',
        nextMatchId: sf2.id,
        nextMatchSlot: 'B',
      },
    });

    return [finalMatch, sf1, sf2, qf1, qf2, qf3];
  }

  // Count >= 8: Standard 8-team Quarter Final Bracket
  const finalMatch = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Grand Final',
      roundNumber: 3,
      matchNumber: 1,
      bracketPosition: 1,
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'TBD',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'TBD',
      status: 'SCHEDULED',
    },
  });

  const sf1 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Semi Finals',
      roundNumber: 2,
      matchNumber: 1,
      bracketPosition: 1,
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'TBD',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'TBD',
      status: 'SCHEDULED',
      nextMatchId: finalMatch.id,
      nextMatchSlot: 'A',
    },
  });

  const sf2 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Semi Finals',
      roundNumber: 2,
      matchNumber: 2,
      bracketPosition: 2,
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'TBD',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'TBD',
      status: 'SCHEDULED',
      nextMatchId: finalMatch.id,
      nextMatchSlot: 'B',
    },
  });

  const qf1 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Quarter Finals',
      roundNumber: 1,
      matchNumber: 1,
      bracketPosition: 1,
      sideAType: p[0]?.type || 'TEAM',
      sideAId: p[0]?.id || 'TBD',
      sideAName: p[0]?.name || 'Qualified 1',
      sideBType: p[7]?.type || 'TEAM',
      sideBId: p[7]?.id || 'TBD',
      sideBName: p[7]?.name || 'Qualified 8',
      status: 'SCHEDULED',
      nextMatchId: sf1.id,
      nextMatchSlot: 'A',
    },
  });

  const qf2 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Quarter Finals',
      roundNumber: 1,
      matchNumber: 2,
      bracketPosition: 2,
      sideAType: p[3]?.type || 'TEAM',
      sideAId: p[3]?.id || 'TBD',
      sideAName: p[3]?.name || 'Qualified 4',
      sideBType: p[4]?.type || 'TEAM',
      sideBId: p[4]?.id || 'TBD',
      sideBName: p[4]?.name || 'Qualified 5',
      status: 'SCHEDULED',
      nextMatchId: sf1.id,
      nextMatchSlot: 'B',
    },
  });

  const qf3 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Quarter Finals',
      roundNumber: 1,
      matchNumber: 3,
      bracketPosition: 3,
      sideAType: p[1]?.type || 'TEAM',
      sideAId: p[1]?.id || 'TBD',
      sideAName: p[1]?.name || 'Qualified 2',
      sideBType: p[6]?.type || 'TEAM',
      sideBId: p[6]?.id || 'TBD',
      sideBName: p[6]?.name || 'Qualified 7',
      status: 'SCHEDULED',
      nextMatchId: sf2.id,
      nextMatchSlot: 'A',
    },
  });

  const qf4 = await tx.match.create({
    data: {
      tournamentId,
      categoryId,
      stage: 'KNOCKOUT',
      round: 'Quarter Finals',
      roundNumber: 1,
      matchNumber: 4,
      bracketPosition: 4,
      sideAType: p[2]?.type || 'TEAM',
      sideAId: p[2]?.id || 'TBD',
      sideAName: p[2]?.name || 'Qualified 3',
      sideBType: p[5]?.type || 'TEAM',
      sideBId: p[5]?.id || 'TBD',
      sideBName: p[5]?.name || 'Qualified 6',
      status: 'SCHEDULED',
      nextMatchId: sf2.id,
      nextMatchSlot: 'B',
    },
  });

  return [finalMatch, sf1, sf2, qf1, qf2, qf3, qf4];
}

/**
 * Recalculate group standings and qualification status for a tournament category.
 */
export async function updateGroupStandingsAndQualification(
  tournamentId: string,
  categoryId: string
) {
  // Fetch category qualification rule
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  const topN = category?.qualificationRule === 'TOP_1' ? 1 : 2;

  // Fetch all group/round-robin stage matches for this category
  const matches = await prisma.match.findMany({
    where: { tournamentId, categoryId, stage: { in: ['GROUP_STAGE', 'ROUND_ROBIN'] } },
    include: { games: true },
  });

  // Fetch current standings or create per team per group
  const existingStandings = await prisma.standing.findMany({
    where: { tournamentId, categoryId },
  });

  // Map of groupId -> standing entries
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
        teamName: s.teamId ? undefined : undefined,
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

  // Calculate statistics from completed matches
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

  // If group stage is complete, advance qualified teams into draft knockout matches
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
      });

      const knockoutMatches = await prisma.match.findMany({
        where: {
          tournamentId,
          categoryId,
          stage: { in: ['KNOCKOUT', 'PLAY_IN'] },
        },
      });

      for (const standing of qualifiedStandings) {
        const participantId = standing.teamId || standing.playerId;
        let participantName = standing.team?.name;
        if (!participantName && standing.playerId) {
          const pl = await prisma.player.findUnique({ where: { id: standing.playerId }, select: { name: true } });
          participantName = pl?.name;
        }
        const participantType = standing.teamId ? 'TEAM' : 'PLAYER';

        if (!participantId || !participantName) continue;

        const targetLabel = `Qualified ${standing.groupName} #${standing.position}`;

        for (const km of knockoutMatches) {
          let updated = false;
          const updateData: any = {};

          if (
            km.sideAId === 'TBD' &&
            (km.sideAName === targetLabel || km.sideAName.includes(`${standing.groupName} #${standing.position}`))
          ) {
            updateData.sideAId = participantId;
            updateData.sideAName = participantName;
            updateData.sideAType = participantType;
            km.sideAId = participantId;
            km.sideAName = participantName;
            updated = true;
          }

          if (
            km.sideBId === 'TBD' &&
            (km.sideBName === targetLabel || km.sideBName.includes(`${standing.groupName} #${standing.position}`))
          ) {
            updateData.sideBId = participantId;
            updateData.sideBName = participantName;
            updateData.sideBType = participantType;
            km.sideBId = participantId;
            km.sideBName = participantName;
            updated = true;
          }

          if (updated) {
            await prisma.match.update({
              where: { id: km.id },
              data: updateData,
            });
          }
        }
      }
    } catch (bracketErr) {
      console.error('[Bracket Qualification Error] Failed to populate knockout matches:', bracketErr);
    }
  }

  return {
    totalMatches,
    completedMatches,
    isGroupStageComplete,
  };
}
