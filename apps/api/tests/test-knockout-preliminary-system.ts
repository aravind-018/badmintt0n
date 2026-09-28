import { getNextPowerOfTwo, isPowerOfTwo } from '@badminton-live/shared';

/**
 * Mathematical & Logic Test Suite for Knockout Preliminary System
 * Tests team counts 2 through 16.
 */
function runKnockoutSystemTests() {
  console.log('===============================================================');
  console.log('RUNNING KNOCKOUT SYSTEM MATHEMATICAL & LOGIC VERIFICATION');
  console.log('===============================================================\n');

  const testCases = [
    { teams: 2, expectedPower: 2, expectedPrelim: 0, expectedDirect: 2, expectedMain: 2 },
    { teams: 3, expectedPower: 4, expectedPrelim: 1, expectedDirect: 1, expectedMain: 2 },
    { teams: 4, expectedPower: 4, expectedPrelim: 0, expectedDirect: 4, expectedMain: 4 },
    { teams: 5, expectedPower: 8, expectedPrelim: 1, expectedDirect: 3, expectedMain: 4 },
    { teams: 6, expectedPower: 8, expectedPrelim: 2, expectedDirect: 2, expectedMain: 4 },
    { teams: 7, expectedPower: 8, expectedPrelim: 3, expectedDirect: 1, expectedMain: 4 },
    { teams: 8, expectedPower: 8, expectedPrelim: 0, expectedDirect: 8, expectedMain: 8 },
    { teams: 9, expectedPower: 16, expectedPrelim: 1, expectedDirect: 7, expectedMain: 8 },
    { teams: 10, expectedPower: 16, expectedPrelim: 2, expectedDirect: 6, expectedMain: 8 },
    { teams: 11, expectedPower: 16, expectedPrelim: 3, expectedDirect: 5, expectedMain: 8 },
    { teams: 12, expectedPower: 16, expectedPrelim: 4, expectedDirect: 4, expectedMain: 8 },
    { teams: 13, expectedPower: 16, expectedPrelim: 5, expectedDirect: 3, expectedMain: 8 },
    { teams: 14, expectedPower: 16, expectedPrelim: 6, expectedDirect: 2, expectedMain: 8 },
    { teams: 15, expectedPower: 16, expectedPrelim: 7, expectedDirect: 1, expectedMain: 8 },
    { teams: 16, expectedPower: 16, expectedPrelim: 0, expectedDirect: 16, expectedMain: 16 },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const teamCount = tc.teams;
    const targetBracket = getNextPowerOfTwo(teamCount);
    const preliminaryMatches = teamCount === targetBracket ? 0 : teamCount - targetBracket / 2;
    const preliminaryParticipants = preliminaryMatches * 2;
    const directQualifiers = teamCount - preliminaryParticipants;
    const mainBracketTeams = preliminaryMatches + directQualifiers;

    const cond1 = preliminaryParticipants + directQualifiers === teamCount;
    const cond2 = mainBracketTeams === (teamCount === targetBracket ? targetBracket : targetBracket / 2);
    const cond3 = targetBracket === tc.expectedPower;
    const cond4 = preliminaryMatches === tc.expectedPrelim;
    const cond5 = directQualifiers === tc.expectedDirect;

    const isSuccess = cond1 && cond2 && cond3 && cond4 && cond5;

    if (isSuccess) {
      passed++;
      console.log(
        `✓ [PASS] Teams: ${teamCount.toString().padStart(2)} -> Target Bracket: ${targetBracket.toString().padStart(2)} | Prelim Matches: ${preliminaryMatches} | Direct Qualifiers: ${directQualifiers} | Main Bracket Size: ${mainBracketTeams}`
      );
    } else {
      failed++;
      console.error(
        `❌ [FAIL] Teams: ${teamCount} -> Expected Target: ${tc.expectedPower}, Got: ${targetBracket} | Expected Prelim: ${tc.expectedPrelim}, Got: ${preliminaryMatches}`
      );
    }
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runKnockoutSystemTests();
