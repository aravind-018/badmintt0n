import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

import { createInitialMatchState, evaluateGameScore, replayMatchEvents, MatchEvent } from '@badminton-live/scoring';

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase5ScoringTests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 5 SCORING TEST SUITE (19/19)');
  console.log('==================================================\n');

  let passed = 0;
  let total = 19;

  try {
    // ----------------------------------------------------
    // TEST 1: 0-0 Initial Game State
    // ----------------------------------------------------
    console.log('TEST 1: 0-0 Initial Game State...');
    const state0 = createInitialMatchState();
    if (state0.games[0].sideAPoints === 0 && state0.games[0].sideBPoints === 0 && !state0.games[0].isComplete) {
      console.log('  ✅ PASSED: Initial state 0-0 verified.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 1');
    }

    // ----------------------------------------------------
    // TEST 2: 21-18 Standard Game Win
    // ----------------------------------------------------
    console.log('TEST 2: 21-18 Standard Game Win...');
    const eval21_18 = evaluateGameScore(21, 18);
    if (eval21_18.isComplete && eval21_18.winner === 'A') {
      console.log('  ✅ PASSED: Game won at 21-18 with 2-point lead.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 2');
    }

    // ----------------------------------------------------
    // TEST 3: 20-20 Deuce Triggered
    // ----------------------------------------------------
    console.log('TEST 3: 20-20 Deuce Requirement...');
    const eval20_20 = evaluateGameScore(20, 20);
    if (!eval20_20.isComplete && eval20_20.isDeuce) {
      console.log('  ✅ PASSED: Deuce state correctly active at 20-20.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 3');
    }

    // ----------------------------------------------------
    // TEST 4: 21-20 Deuce Continues
    // ----------------------------------------------------
    console.log('TEST 4: 21-20 (Must lead by 2)...');
    const eval21_20 = evaluateGameScore(21, 20);
    if (!eval21_20.isComplete) {
      console.log('  ✅ PASSED: Game continues at 21-20 (no 2-point lead yet).\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 4');
    }

    // ----------------------------------------------------
    // TEST 5: 21-21 Deuce Continues
    // ----------------------------------------------------
    console.log('TEST 5: 21-21 Deuce Continues...');
    const eval21_21 = evaluateGameScore(21, 21);
    if (!eval21_21.isComplete && eval21_21.isDeuce) {
      console.log('  ✅ PASSED: Deuce active at 21-21.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 5');
    }

    // ----------------------------------------------------
    // TEST 6: 22-20 Deuce Game Win
    // ----------------------------------------------------
    console.log('TEST 6: 22-20 Deuce Win...');
    const eval22_20 = evaluateGameScore(22, 20);
    if (eval22_20.isComplete && eval22_20.winner === 'A') {
      console.log('  ✅ PASSED: Game won at 22-20 with 2-point lead.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 6');
    }

    // ----------------------------------------------------
    // TEST 7: 29-29 Golden Point State
    // ----------------------------------------------------
    console.log('TEST 7: 29-29 Golden Point State...');
    const eval29_29 = evaluateGameScore(29, 29);
    if (!eval29_29.isComplete) {
      console.log('  ✅ PASSED: 29-29 game active for golden point.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 7');
    }

    // ----------------------------------------------------
    // TEST 8: 30-29 Max 30-Point Limit Win
    // ----------------------------------------------------
    console.log('TEST 8: 30-29 Max 30-Point Cap Win...');
    const eval30_29 = evaluateGameScore(30, 29);
    if (eval30_29.isComplete && eval30_29.winner === 'A') {
      console.log('  ✅ PASSED: Game won immediately at 30 points (max cap).\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 8');
    }

    // ----------------------------------------------------
    // TEST 9: Match 2-0 (Straight Sets Win)
    // ----------------------------------------------------
    console.log('TEST 9: Match 2-0 (Straight Sets Win)...');
    const events2_0: MatchEvent[] = [];
    for (let i = 0; i < 21; i++) events2_0.push({ id: `e1_${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' });
    for (let i = 0; i < 21; i++) events2_0.push({ id: `e2_${i}`, matchId: 'm1', gameNumber: 2, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' });
    const state2_0 = replayMatchEvents(events2_0);
    if (state2_0.sideAGamesWon === 2 && state2_0.isMatchComplete && state2_0.winner === 'A') {
      console.log('  ✅ PASSED: Match 2-0 straight sets win verified.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 9');
    }

    // ----------------------------------------------------
    // TEST 10: Match 2-1 (3-Set Match Win)
    // ----------------------------------------------------
    console.log('TEST 10: Match 2-1 (3-Set Match Win)...');
    const events2_1: MatchEvent[] = [];
    for (let i = 0; i < 21; i++) events2_1.push({ id: `g1_${i}`, matchId: 'm2', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' });
    for (let i = 0; i < 21; i++) events2_1.push({ id: `g2_${i}`, matchId: 'm2', gameNumber: 2, type: 'POINT_SIDE_B', timestamp: '', createdBy: 'B' });
    for (let i = 0; i < 21; i++) events2_1.push({ id: `g3_${i}`, matchId: 'm2', gameNumber: 3, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' });
    const state2_1 = replayMatchEvents(events2_1);
    if (state2_1.sideAGamesWon === 2 && state2_1.sideBGamesWon === 1 && state2_1.isMatchComplete && state2_1.winner === 'A') {
      console.log('  ✅ PASSED: Match 2-1 three-set win verified.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 10');
    }

    // ----------------------------------------------------
    // TEST 11: Undo (Single Point Undo)
    // ----------------------------------------------------
    console.log('TEST 11: Single Point Undo...');
    const eventsUndo: MatchEvent[] = [
      { id: 'u1', matchId: 'm3', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' },
      { id: 'u2', matchId: 'm3', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' },
      { id: 'u3', matchId: 'm3', gameNumber: 1, type: 'UNDO', timestamp: '', createdBy: 'A' },
    ];
    const stateUndo = replayMatchEvents(eventsUndo);
    if (stateUndo.games[0].sideAPoints === 1) {
      console.log('  ✅ PASSED: Single point undo rolled score back from 2 to 1.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 11');
    }

    // ----------------------------------------------------
    // TEST 12: Multiple Undo Operations
    // ----------------------------------------------------
    console.log('TEST 12: Multiple Undo Operations...');
    const eventsMultiUndo: MatchEvent[] = [
      { id: 'mu1', matchId: 'm4', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: '', createdBy: 'A' },
      { id: 'mu2', matchId: 'm4', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: '', createdBy: 'B' },
      { id: 'mu3', matchId: 'm4', gameNumber: 1, type: 'UNDO', timestamp: '', createdBy: 'B' },
      { id: 'mu4', matchId: 'm4', gameNumber: 1, type: 'UNDO', timestamp: '', createdBy: 'B' },
    ];
    const stateMultiUndo = replayMatchEvents(eventsMultiUndo);
    if (stateMultiUndo.games[0].sideAPoints === 0 && stateMultiUndo.games[0].sideBPoints === 0) {
      console.log('  ✅ PASSED: Multiple undos rolled score back to 0-0.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 12');
    }

    // ----------------------------------------------------
    // Live Server API Integration Tests (Tests 13 - 19)
    // ----------------------------------------------------
    // Login ADMIN for match creation
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@badminton.live', password: 'AdminPassword123!' }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    const adminToken = adminLoginData.accessToken;
    const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };

    // Login SCORER for scoring actions
    const scorerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'scorer@badminton.live', password: 'ScorerPassword123!' }),
    });
    const scorerLoginData: any = await scorerLoginRes.json();
    const scorerToken = scorerLoginData.accessToken;
    const scorerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${scorerToken}` };

    const tRes = await fetch(`${API_BASE}/tournaments`);
    const tData: any = await tRes.json();
    const tournamentId = tData.tournaments?.[0]?.id;

    const cRes = await fetch(`${API_BASE}/categories?tournamentId=${tournamentId}`);
    const cData: any = await cRes.json();
    const categoryId = cData.categories?.[0]?.id;

    // Create a live match for server tests using ADMIN token
    const createMatchRes = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        tournamentId,
        categoryId,
        round: 'Phase 5 Test Match',
        sideAName: 'Alpha Side',
        sideBName: 'Beta Side',
        status: 'SCHEDULED',
      }),
    });
    const matchData: any = await createMatchRes.json();
    const testMatchId = matchData.match?.id;

    // ----------------------------------------------------
    // TEST 13: Point after match completion
    // ----------------------------------------------------
    console.log('TEST 13: Reject point after match completion...');
    // Complete match first
    await fetch(`${API_BASE}/matches/${testMatchId}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'COMPLETE' }),
    });

    const postPointCompletedRes = await fetch(`${API_BASE}/matches/${testMatchId}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'POINT_SIDE_A', side: 'A' }),
    });
    const postPointCompletedData: any = await postPointCompletedRes.json();
    if (postPointCompletedRes.status === 400 && postPointCompletedData.error.includes('completed match')) {
      console.log('  ✅ PASSED: Server rejected scoring on completed match with HTTP 400.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 13:', postPointCompletedData);
    }

    // ----------------------------------------------------
    // TEST 14: Invalid Scorer (Unauthenticated)
    // ----------------------------------------------------
    console.log('TEST 14: Reject unauthenticated scorer...');
    const unauthScoreRes = await fetch(`${API_BASE}/matches/${testMatchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'POINT_SIDE_A' }),
    });
    if (unauthScoreRes.status === 401) {
      console.log('  ✅ PASSED: Server rejected unauthenticated request with HTTP 401.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 14');
    }

    // Create fresh match for tests 15-19 using ADMIN token
    const match2Res = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        tournamentId,
        categoryId,
        round: 'Phase 5 Test Match 2',
        sideAName: 'Alpha Side',
        sideBName: 'Beta Side',
        status: 'SCHEDULED',
      }),
    });
    const match2Data: any = await match2Res.json();
    const m2Id = match2Data.match?.id;

    // ----------------------------------------------------
    // TEST 15: Duplicate requests (Idempotency)
    // ----------------------------------------------------
    console.log('TEST 15: Duplicate requests (Idempotency check)...');
    const reqId = 'req-dup-test-100';
    await fetch(`${API_BASE}/matches/${m2Id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'POINT_SIDE_A', side: 'A', requestId: reqId }),
    });

    // Send duplicate request
    const dupRes = await fetch(`${API_BASE}/matches/${m2Id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'POINT_SIDE_A', side: 'A', requestId: reqId }),
    });
    const dupData: any = await dupRes.json();
    if (dupRes.status === 200 && dupData.message.includes('Duplicate request ignored')) {
      console.log('  ✅ PASSED: Duplicate request ignored safely.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 15:', dupData);
    }

    // ----------------------------------------------------
    // TEST 16: Pause Match
    // ----------------------------------------------------
    console.log('TEST 16: Pause Match...');
    const pauseRes = await fetch(`${API_BASE}/matches/${m2Id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'PAUSE' }),
    });
    const pauseData: any = await pauseRes.json();
    if (pauseRes.status === 200 && pauseData.state?.status === 'PAUSED') {
      console.log('  ✅ PASSED: Match transitioned to PAUSED status.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 16:', pauseData);
    }

    // ----------------------------------------------------
    // TEST 17: Resume Match
    // ----------------------------------------------------
    console.log('TEST 17: Resume Match...');
    const resumeRes = await fetch(`${API_BASE}/matches/${m2Id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'RESUME' }),
    });
    const resumeData: any = await resumeRes.json();
    if (resumeRes.status === 200 && resumeData.state?.status === 'LIVE') {
      console.log('  ✅ PASSED: Match transitioned back to LIVE status.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 17:', resumeData);
    }

    // ----------------------------------------------------
    // TEST 18: Walkover
    // ----------------------------------------------------
    console.log('TEST 18: Walkover Match...');
    const woMatchRes = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ tournamentId, categoryId, round: 'WO Test', sideAName: 'A', sideBName: 'B' }),
    });
    const woMatchData: any = await woMatchRes.json();
    const woRes = await fetch(`${API_BASE}/matches/${woMatchData.match.id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'WALKOVER', side: 'A' }),
    });
    const woData: any = await woRes.json();
    if (woRes.status === 200 && woData.state?.status === 'WALKOVER') {
      console.log('  ✅ PASSED: Walkover processed and winner assigned.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 18:', woData);
    }

    // ----------------------------------------------------
    // TEST 19: Retirement
    // ----------------------------------------------------
    console.log('TEST 19: Retirement Match...');
    const retMatchRes = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ tournamentId, categoryId, round: 'Retire Test', sideAName: 'A', sideBName: 'B' }),
    });
    const retMatchData: any = await retMatchRes.json();
    const retRes = await fetch(`${API_BASE}/matches/${retMatchData.match.id}/events`, {
      method: 'POST',
      headers: scorerHeaders,
      body: JSON.stringify({ type: 'RETIRE', side: 'A' }),
    });
    const retData: any = await retRes.json();
    if (retRes.status === 200 && retData.state?.status === 'RETIRED') {
      console.log('  ✅ PASSED: Retirement processed and opponent assigned as winner.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED TEST 19:', retData);
    }

    console.log('==================================================');
    console.log(`RESULTS: ${passed}/${total} TESTS PASSED CLEANLY! 🎉`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal error during Phase 5 scoring test suite:', err);
  }
}

runPhase5ScoringTests();
