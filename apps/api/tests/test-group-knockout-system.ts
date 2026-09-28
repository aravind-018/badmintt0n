import {
  isPowerOfTwo,
  getKnockoutRoundName,
  calculateGroupDistributionSizes,
  validateGroupKnockoutConfig,
  suggestValidGroupConfigs,
} from '@badminton-live/shared';

import {
  distributeTeamsIntoGroups,
  seedKnockoutFirstRound,
  validateKnockoutSeeding,
  Participant,
  QualifiedSlot,
} from '../src/utils/fixtureGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('=============================================================================');
  console.log('  TEST SUITE: BADMINTON GROUP STAGE + KNOCKOUT SYSTEM');
  console.log('=============================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Power of Two Function
  // ---------------------------------------------------------------------------
  console.log('--- 1. Power of Two Function Tests ---');
  assert(isPowerOfTwo(1) === true, '1 is power of 2');
  assert(isPowerOfTwo(2) === true, '2 is power of 2');
  assert(isPowerOfTwo(4) === true, '4 is power of 2');
  assert(isPowerOfTwo(8) === true, '8 is power of 2');
  assert(isPowerOfTwo(16) === true, '16 is power of 2');
  assert(isPowerOfTwo(32) === true, '32 is power of 2');
  assert(isPowerOfTwo(64) === true, '64 is power of 2');
  assert(isPowerOfTwo(128) === true, '128 is power of 2');

  assert(isPowerOfTwo(0) === false, '0 is NOT power of 2');
  assert(isPowerOfTwo(3) === false, '3 is NOT power of 2');
  assert(isPowerOfTwo(5) === false, '5 is NOT power of 2');
  assert(isPowerOfTwo(6) === false, '6 is NOT power of 2');
  assert(isPowerOfTwo(10) === false, '10 is NOT power of 2');
  assert(isPowerOfTwo(12) === false, '12 is NOT power of 2');
  assert(isPowerOfTwo(20) === false, '20 is NOT power of 2');
  assert(isPowerOfTwo(24) === false, '24 is NOT power of 2');
  assert(isPowerOfTwo(40) === false, '40 is NOT power of 2');

  // ---------------------------------------------------------------------------
  // 2. Group Distribution for Odd & Even Team Counts
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Group Distribution Tests ---');

  const testDistribution = (totalTeams: number, numGroups: number, expectedCounts: number[]) => {
    const participants: Participant[] = Array.from({ length: totalTeams }, (_, i) => ({
      id: `team_${i + 1}`,
      name: `Team ${i + 1}`,
      type: 'TEAM',
    }));

    const groups = distributeTeamsIntoGroups(participants, numGroups);
    const counts = groups.map((g) => g.teams.length);
    const maxGroupSize = Math.max(...counts);
    const minGroupSize = Math.min(...counts);

    assert(groups.length === numGroups, `${totalTeams} teams into ${numGroups} groups produces ${numGroups} groups`);
    assert(
      JSON.stringify(counts) === JSON.stringify(expectedCounts),
      `${totalTeams} teams into ${numGroups} groups distribution is [${counts.join(', ')}] (Expected: [${expectedCounts.join(', ')}])`
    );
    assert(maxGroupSize - minGroupSize <= 1, `maxGroupSize (${maxGroupSize}) - minGroupSize (${minGroupSize}) <= 1`);

    // Integrity checks
    const allAssigned = groups.flatMap((g) => g.teams);
    assert(allAssigned.length === totalTeams, `Total assigned teams (${allAssigned.length}) === ${totalTeams}`);
    const uniqueIds = new Set(allAssigned.map((t) => t.id));
    assert(uniqueIds.size === totalTeams, `Every team appears exactly once without duplicates`);
  };

  testDistribution(16, 4, [4, 4, 4, 4]);
  testDistribution(17, 4, [5, 4, 4, 4]);
  testDistribution(18, 4, [5, 5, 4, 4]);
  testDistribution(19, 4, [5, 5, 5, 4]);
  testDistribution(20, 4, [5, 5, 5, 5]);

  // Arbitrary odd team count tests
  testDistribution(23, 5, [5, 5, 5, 4, 4]);
  testDistribution(27, 6, [5, 5, 5, 4, 4, 4]);
  testDistribution(31, 8, [4, 4, 4, 4, 4, 4, 4, 3]);

  // ---------------------------------------------------------------------------
  // 3. Qualification Validation & Power of 2 Rules
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Qualification Validation & Rejection Tests ---');

  // Valid configurations
  assert(validateGroupKnockoutConfig(16, 4, 2).valid === true, '16 teams, 4 groups, 2 qual/group (4x2=8) -> VALID Quarter Final');
  assert(validateGroupKnockoutConfig(32, 8, 2).valid === true, '32 teams, 8 groups, 2 qual/group (8x2=16) -> VALID Round of 16');
  assert(validateGroupKnockoutConfig(64, 16, 2).valid === true, '64 teams, 16 groups, 2 qual/group (16x2=32) -> VALID Round of 32');
  assert(validateGroupKnockoutConfig(19, 4, 2).valid === true, '19 teams, 4 groups (5/5/5/4), 2 qual/group (4x2=8) -> VALID Quarter Final');
  assert(validateGroupKnockoutConfig(18, 4, 2).valid === true, '18 teams, 4 groups (5/5/4/4), 2 qual/group (4x2=8) -> VALID Quarter Final');
  assert(validateGroupKnockoutConfig(40, 8, 2).valid === true, '40 teams, 8 groups (5x8), 2 qual/group (8x2=16) -> VALID Round of 16');

  // Invalid configurations (must be rejected)
  assert(validateGroupKnockoutConfig(12, 3, 2).valid === false, '3 groups x 2 qual/group = 6 -> REJECTED (6 is not power of 2)');
  assert(validateGroupKnockoutConfig(15, 5, 2).valid === false, '5 groups x 2 qual/group = 10 -> REJECTED (10 is not power of 2)');
  assert(validateGroupKnockoutConfig(24, 6, 2).valid === false, '6 groups x 2 qual/group = 12 -> REJECTED (12 is not power of 2)');
  assert(validateGroupKnockoutConfig(30, 10, 2).valid === false, '10 groups x 2 qual/group = 20 -> REJECTED (20 is not power of 2)');
  assert(validateGroupKnockoutConfig(36, 12, 2).valid === false, '12 groups x 2 qual/group = 24 -> REJECTED (24 is not power of 2)');

  const res24 = validateGroupKnockoutConfig(24, 6, 2);
  assert(res24.error !== undefined && res24.error.includes('12 teams would qualify'), 'Error message clearly explains why configuration is invalid');
  assert(res24.suggestions !== undefined && res24.suggestions.length > 0, 'Suggestions engine produces valid alternative options');

  // ---------------------------------------------------------------------------
  // 4. Knockout Seeding & Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Knockout Seeding Integrity Tests ---');

  // Test Seeding for 4 groups x 2 qualifiers = 8 qualified teams (Quarter Final)
  const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'];
  const qualifiedSlots: QualifiedSlot[] = [];
  groupNames.forEach((gName, gIdx) => {
    for (let p = 1; p <= 2; p++) {
      qualifiedSlots.push({
        groupId: `group_${gIdx + 1}`,
        groupName: gName,
        groupOrder: gIdx + 1,
        position: p,
        teamId: `team_${gName}_${p}`,
        name: `Team ${gName} #${p}`,
        type: 'TEAM',
      });
    }
  });

  assert(qualifiedSlots.length === 8, '8 total qualified slots created for Quarter Finals');

  const seededFirstRound = seedKnockoutFirstRound(qualifiedSlots, 4, 2);
  assert(seededFirstRound.length === 4, '4 first round Quarter Final matches created');

  const valSeeding = validateKnockoutSeeding(qualifiedSlots, seededFirstRound);
  assert(valSeeding.valid === true, 'Seeding validation PASSED with 0 errors');

  // Verify group-mate protection in round 1
  for (const match of seededFirstRound) {
    const groupA = match.sideA.groupName;
    const groupB = match.sideB.groupName;
    assert(groupA !== groupB, `Match '${match.sideA.name}' vs '${match.sideB.name}' pairs teams from different groups (${groupA} vs ${groupB})`);
  }

  // Verify group mates are placed in opposite halves of the bracket
  const topHalfMatches = seededFirstRound.slice(0, 2);
  const bottomHalfMatches = seededFirstRound.slice(2, 4);

  const topHalfGroups = new Set(topHalfMatches.flatMap((m) => [m.sideA.groupName, m.sideB.groupName]));
  const bottomHalfGroups = new Set(bottomHalfMatches.flatMap((m) => [m.sideA.groupName, m.sideB.groupName]));

  for (const gName of groupNames) {
    assert(topHalfGroups.has(gName) && bottomHalfGroups.has(gName), `Group mates from ${gName} placed in opposite halves of the bracket`);
  }

  console.log('\n=============================================================================');
  console.log('  ALL GROUP STAGE + KNOCKOUT SYSTEM TESTS PASSED SUCCESSFULLY! ✓');
  console.log('=============================================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
