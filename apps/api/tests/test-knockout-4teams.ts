import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '@badminton-live/database';
import { createKnockoutMatchesInTx } from '../src/utils/fixtureGenerator';
import { advanceBracketWinner } from '../src/utils/bracket';
import { getNextPowerOfTwo, isPowerOfTwo, getKnockoutRoundName } from '@badminton-live/shared';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runKnockout4TeamsTests() {
  console.log('=============================================================================');
  console.log('  TEST SUITE: KNOCKOUT FIXTURE GENERATOR FOR EXACTLY 4 TEAMS');
  console.log('=============================================================================\n');

  let passed = 0;
  let testTournament: any = null;
  let testCategory: any = null;

  try {
    // -------------------------------------------------------------------------
    // Setup: Create isolated test tournament and 4 test teams
    // -------------------------------------------------------------------------
    console.log('--- Setup: Preparing test tournament and 4 registered teams ---');
    const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!adminUser) {
      throw new Error('Super admin user required for test setup.');
    }

    const uniqueSuffix = Date.now().toString().slice(-6);
    testTournament = await prisma.tournament.create({
      data: {
        slug: `test-knockout-4t-${uniqueSuffix}`,
        name: `Test 4-Team Knockout Tournament ${uniqueSuffix}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
        format: 'KNOCKOUT',
        createdById: adminUser.id,
      },
    });

    testCategory = await prisma.category.create({
      data: {
        tournamentId: testTournament.id,
        type: 'MENS_SINGLES',
      },
    });

    const teamNames = ['Alpha Hawks', 'Bravo Lions', 'Charlie Tigers', 'Delta Eagles'];
    const createdTeams = [];
    for (const name of teamNames) {
      const team = await prisma.team.create({
        data: {
          tournamentId: testTournament.id,
          name,
        },
      });
      createdTeams.push(team);
    }
    assert(createdTeams.length === 4, '4 distinct teams registered in test tournament');

    // -------------------------------------------------------------------------
    // TEST 1: Bracket Calculation & Mathematical Integrity for 4 Teams
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Bracket Calculation & Mathematical Integrity ---');
    const totalTeams = 4;
    const targetBracket = getNextPowerOfTwo(totalTeams);
    const preliminaryMatches = totalTeams === targetBracket ? 0 : totalTeams - targetBracket / 2;
    const preliminaryParticipants = preliminaryMatches * 2;
    const directQualifiers = totalTeams - preliminaryParticipants;
    const expectedMainTeams = totalTeams === targetBracket ? targetBracket : targetBracket / 2;

    assert(isPowerOfTwo(totalTeams) === true, '4 is recognized as a valid power of 2');
    assert(targetBracket === 4, 'targetBracket for 4 teams is 4');
    assert(preliminaryMatches === 0, 'No preliminary matches generated for 4 teams');
    assert(directQualifiers === 4, 'All 4 teams are direct qualifiers');
    assert(
      preliminaryParticipants + directQualifiers === totalTeams &&
      preliminaryMatches + directQualifiers === expectedMainTeams,
      'Knockout bracket calculation correctly validates 4 teams without error'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Unranked Shuffling & No Duplicate Teams / No Byes
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Unranked Shuffling & Pairing Integrity ---');
    const participants = createdTeams.map((t) => ({
      id: t.id,
      name: t.name,
      type: 'TEAM' as const,
    }));

    // Perform Fisher-Yates shuffle on unranked teams
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    assert(shuffled.length === 4, '4 teams retained after shuffle');
    const distinctIds = new Set(shuffled.map((t) => t.id));
    assert(distinctIds.size === 4, 'All 4 teams remain distinct with 0 duplicates');

    const seededPairs: { sideA: any; sideB: any }[] = [
      { sideA: shuffled[0], sideB: shuffled[1] },
      { sideA: shuffled[2], sideB: shuffled[3] },
    ];

    assert(seededPairs.length === 2, '2 first-round semifinal pairs created');
    assert(seededPairs[0].sideA.id !== seededPairs[0].sideB.id, 'Semi-Final 1 has 2 distinct opponents');
    assert(seededPairs[1].sideA.id !== seededPairs[1].sideB.id, 'Semi-Final 2 has 2 distinct opponents');
    assert(
      seededPairs[0].sideA.id !== 'TBD' && seededPairs[0].sideB.id !== 'TBD',
      'Semi-Final 1 has no TBD/bye placeholder'
    );
    assert(
      seededPairs[1].sideA.id !== 'TBD' && seededPairs[1].sideB.id !== 'TBD',
      'Semi-Final 2 has no TBD/bye placeholder'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Generate Fixtures: Exactly 3 Matches (2 Semifinals + 1 Final)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Generate Fixtures: 2 Semifinals + 1 Final ---');
    const createdMatches = await prisma.$transaction(async (tx) => {
      return createKnockoutMatchesInTx(tx, testTournament.id, testCategory.id, seededPairs);
    });

    assert(createdMatches.length === 3, 'Exactly 3 matches generated for 4 teams');

    const sfMatches = createdMatches.filter((m) => m.roundNumber === 1);
    const finalMatches = createdMatches.filter((m) => m.roundNumber === 2);

    assert(sfMatches.length === 2, 'Exactly 2 semifinal matches generated (roundNumber = 1)');
    assert(finalMatches.length === 1, 'Exactly 1 final match generated (roundNumber = 2)');

    const sf1 = sfMatches.find((m) => m.matchNumber === 1);
    const sf2 = sfMatches.find((m) => m.matchNumber === 2);
    const finalMatch = finalMatches[0];

    assert(sf1 !== undefined, 'Semi-Final 1 found with matchNumber = 1');
    assert(sf2 !== undefined, 'Semi-Final 2 found with matchNumber = 2');
    assert(finalMatch !== undefined, 'Final found with roundNumber = 2');

    assert(sf1?.round === 'Semi-Final 1', `Semi-Final 1 round label is '${sf1?.round}'`);
    assert(sf2?.round === 'Semi-Final 2', `Semi-Final 2 round label is '${sf2?.round}'`);
    assert(finalMatch?.round === 'Grand Final', `Final round label is '${finalMatch?.round}'`);

    // Verify match linkage to Final
    assert(sf1?.nextMatchId === finalMatch?.id, 'Semi-Final 1 nextMatchId points to Final ID');
    assert(sf1?.nextMatchSlot === 'A', 'Semi-Final 1 nextMatchSlot is slot A');
    assert(sf2?.nextMatchId === finalMatch?.id, 'Semi-Final 2 nextMatchId points to Final ID');
    assert(sf2?.nextMatchSlot === 'B', 'Semi-Final 2 nextMatchSlot is slot B');

    // -------------------------------------------------------------------------
    // TEST 4: Dynamic Winner References on the Final Match (No Fake Team IDs)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Dynamic Winner References in Final ---');
    assert(finalMatch?.sideAId === 'TBD', 'Final sideAId is schema-compliant "TBD"');
    assert(finalMatch?.sideBId === 'TBD', 'Final sideBId is schema-compliant "TBD"');
    assert(
      finalMatch?.sideAName === 'Winner of Semi-Final 1',
      `Final sideAName is '${finalMatch?.sideAName}' (Expected: 'Winner of Semi-Final 1')`
    );
    assert(
      finalMatch?.sideBName === 'Winner of Semi-Final 2',
      `Final sideBName is '${finalMatch?.sideBName}' (Expected: 'Winner of Semi-Final 2')`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Final Cannot Start Before Both Semifinal Winners Are Available
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Playable Validation: Final Cannot Start with TBD Participants ---');
    const isPlayable = (match: any) =>
      Boolean(
        match?.sideAId &&
        match?.sideAId !== 'TBD' &&
        match?.sideBId &&
        match?.sideBId !== 'TBD' &&
        !match?.sideAName?.startsWith('Winner') &&
        !match?.sideBName?.startsWith('Winner')
      );

    const freshFinal = await prisma.match.findUnique({ where: { id: finalMatch!.id } });
    assert(isPlayable(freshFinal) === false, 'Final is NOT playable before semifinal winners are known');

    // -------------------------------------------------------------------------
    // TEST 6: Semi-Final 1 Completion Advances Winner to Final Slot A
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Semi-Final 1 Winner Progression to Final Slot 1 ---');
    const sf1WinnerId = sf1!.sideAId;
    const sf1WinnerName = sf1!.sideAName;

    await prisma.match.update({
      where: { id: sf1!.id },
      data: {
        status: 'COMPLETED',
        winnerId: sf1WinnerId,
        sideAGamesWon: 2,
        sideBGamesWon: 0,
      },
    });
    await advanceBracketWinner(sf1!.id);

    const finalAfterSF1 = await prisma.match.findUnique({ where: { id: finalMatch!.id } });
    assert(
      finalAfterSF1?.sideAId === sf1WinnerId,
      `Final sideAId updated to SF1 Winner ID: '${finalAfterSF1?.sideAId}'`
    );
    assert(
      finalAfterSF1?.sideAName === sf1WinnerName,
      `Final sideAName updated to SF1 Winner Name: '${finalAfterSF1?.sideAName}'`
    );
    assert(
      finalAfterSF1?.sideBId === 'TBD' && finalAfterSF1?.sideBName === 'Winner of Semi-Final 2',
      'Final sideB remains "Winner of Semi-Final 2" pending SF2 completion'
    );
    assert(isPlayable(finalAfterSF1) === false, 'Final is STILL not playable with only 1 finalist known');

    // -------------------------------------------------------------------------
    // TEST 7: Semi-Final 2 Completion Advances Winner to Final Slot B
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Semi-Final 2 Winner Progression to Final Slot 2 ---');
    const sf2WinnerId = sf2!.sideBId;
    const sf2WinnerName = sf2!.sideBName;

    await prisma.match.update({
      where: { id: sf2!.id },
      data: {
        status: 'COMPLETED',
        winnerId: sf2WinnerId,
        sideAGamesWon: 0,
        sideBGamesWon: 2,
      },
    });
    await advanceBracketWinner(sf2!.id);

    const finalAfterSF2 = await prisma.match.findUnique({ where: { id: finalMatch!.id } });
    assert(
      finalAfterSF2?.sideBId === sf2WinnerId,
      `Final sideBId updated to SF2 Winner ID: '${finalAfterSF2?.sideBId}'`
    );
    assert(
      finalAfterSF2?.sideBName === sf2WinnerName,
      `Final sideBName updated to SF2 Winner Name: '${finalAfterSF2?.sideBName}'`
    );
    assert(isPlayable(finalAfterSF2) === true, 'Final is NOW PLAYABLE with both finalists confirmed!');

    // -------------------------------------------------------------------------
    // TEST 8: Undo / Revert Semi-Final Resets Downstream Final Slot
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Undo / Revert Resets Final Slot Back to Dynamic Winner Reference ---');
    await prisma.match.update({
      where: { id: sf2!.id },
      data: {
        status: 'LIVE',
        winnerId: null,
      },
    });
    await advanceBracketWinner(sf2!.id);

    const finalAfterUndo = await prisma.match.findUnique({ where: { id: finalMatch!.id } });
    assert(finalAfterUndo?.sideBId === 'TBD', 'Final sideBId reset back to "TBD"');
    assert(
      finalAfterUndo?.sideBName === 'Winner of Semi-Final 2',
      `Final sideBName restored to '${finalAfterUndo?.sideBName}' (Expected: 'Winner of Semi-Final 2')`
    );
    assert(isPlayable(finalAfterUndo) === false, 'Final is again NOT playable after semifinal undo');

    console.log('\n=============================================================================');
    console.log('  ALL 4-TEAM KNOCKOUT TESTS PASSED PERFECTLY! ✓');
    console.log('=============================================================================\n');
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove test tournament and matches
    // -------------------------------------------------------------------------
    if (testTournament) {
      try {
        const matches = await prisma.match.findMany({ where: { tournamentId: testTournament.id } });
        const mIds = matches.map((m) => m.id);
        if (mIds.length > 0) {
          await prisma.match.updateMany({ where: { id: { in: mIds } }, data: { nextMatchId: null } });
          await prisma.matchEvent.deleteMany({ where: { matchId: { in: mIds } } });
          await prisma.matchGame.deleteMany({ where: { matchId: { in: mIds } } });
          await prisma.match.deleteMany({ where: { id: { in: mIds } } });
        }
        await prisma.standing.deleteMany({ where: { tournamentId: testTournament.id } });
        await prisma.team.deleteMany({ where: { tournamentId: testTournament.id } });
        await prisma.category.deleteMany({ where: { tournamentId: testTournament.id } });
        await prisma.tournament.delete({ where: { id: testTournament.id } });
        console.log('Test cleanup completed successfully.');
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr);
      }
    }
    await prisma.$disconnect();
  }
}

runKnockout4TeamsTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
