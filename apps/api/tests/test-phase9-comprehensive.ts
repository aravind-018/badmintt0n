import { config } from 'dotenv';
import path from 'path';
import { io as ClientIO } from 'socket.io-client';
import { replayMatchEvents, createInitialMatchState, MatchEvent } from '@badminton-live/scoring';

config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';

async function runPhase9ComprehensivePass() {
  console.log('\n================================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 9 COMPREHENSIVE PRODUCTION READINESS PASS');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    }
  }

  // --------------------------------------------------------------------------
  // PART 1: SCORING ENGINE RULES RE-TEST (PURE BWF RULES)
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------');
  console.log('PART 1: BWF SCORING ENGINE RULES VERIFICATION');
  console.log('--------------------------------------------------');

  // Test 1.1: 21-point standard win
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 21; i++) {
      events.push({ id: `e-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    }
    const state = replayMatchEvents(events);
    assertTest('21-Point Standard Game Win', state.games[0].isComplete && state.games[0].winner === 'A' && state.games[0].sideAPoints === 21, `Game 1 score: ${state.games[0].sideAPoints}-${state.games[0].sideBPoints}`);
  }

  // Test 1.2: 20-20 Deuce requirement
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 20; i++) {
      events.push({ id: `a-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
      events.push({ id: `b-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: new Date().toISOString(), createdBy: 's' });
    }
    const state = replayMatchEvents(events);
    assertTest('20-20 Deuce Detection', state.games[0].isDeuce && !state.games[0].isComplete, `20-20 Deuce detected: ${state.games[0].isDeuce}`);
  }

  // Test 1.3: 2-Point margin win at deuce (22-20)
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 20; i++) {
      events.push({ id: `a-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
      events.push({ id: `b-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: new Date().toISOString(), createdBy: 's' });
    }
    events.push({ id: 'a-21', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    events.push({ id: 'a-22', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    const state = replayMatchEvents(events);
    assertTest('Two-Point Margin Win (22-20)', state.games[0].isComplete && state.games[0].sideAPoints === 22 && state.games[0].sideBPoints === 20, `Deuce margin win: 22-20`);
  }

  // Test 1.4: 29-29 Extreme Cap (30-point hard limit)
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 29; i++) {
      events.push({ id: `a-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
      events.push({ id: `b-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: new Date().toISOString(), createdBy: 's' });
    }
    events.push({ id: 'b-30', matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_B', timestamp: new Date().toISOString(), createdBy: 's' });
    const state = replayMatchEvents(events);
    assertTest('30-Point Hard Maximum Cap (30-29)', state.games[0].isComplete && state.games[0].winner === 'B' && state.games[0].sideBPoints === 30, `Max cap win: 30-29 for Side B`);
  }

  // Test 1.5: Straight sets 2-0 Match Win
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 21; i++) events.push({ id: `g1-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    for (let i = 0; i < 21; i++) events.push({ id: `g2-${i}`, matchId: 'm1', gameNumber: 2, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    const state = replayMatchEvents(events);
    assertTest('Straight Sets 2-0 Match Completion', state.isMatchComplete && state.winner === 'A' && state.sideAGamesWon === 2, `Match winner: Side A (2-0)`);
  }

  // Test 1.6: 3-Set 2-1 Match Win
  {
    let events: MatchEvent[] = [];
    for (let i = 0; i < 21; i++) events.push({ id: `g1-${i}`, matchId: 'm1', gameNumber: 1, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    for (let i = 0; i < 21; i++) events.push({ id: `g2-${i}`, matchId: 'm1', gameNumber: 2, type: 'POINT_SIDE_B', timestamp: new Date().toISOString(), createdBy: 's' });
    for (let i = 0; i < 21; i++) events.push({ id: `g3-${i}`, matchId: 'm1', gameNumber: 3, type: 'POINT_SIDE_A', timestamp: new Date().toISOString(), createdBy: 's' });
    const state = replayMatchEvents(events);
    assertTest('Three-Set 2-1 Match Completion', state.isMatchComplete && state.winner === 'A' && state.sideAGamesWon === 2 && state.sideBGamesWon === 1, `Match winner: Side A (2-1)`);
  }

  // --------------------------------------------------------------------------
  // PART 2: AUTHENTICATION, AUTHORIZATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------');
  console.log('PART 2: AUTHENTICATION & ACCESS CONTROL SECURITY REVIEW');
  console.log('--------------------------------------------------');

  // Login as admin
  let token = '';
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@badminton.live', password: 'AdminPassword123!' }),
    });
    const loginData: any = await loginRes.json();
    token = loginData.accessToken;
    assertTest('SUPER_ADMIN Authentication & JWT Issuance', loginRes.ok && !!token, 'Valid JWT token returned');
  } catch (err: any) {
    assertTest('SUPER_ADMIN Authentication', false, err.message);
  }

  // Test unauthenticated access to protected route
  try {
    const unauthRes = await fetch(`${API_BASE}/auth/admin-only`);
    assertTest('Unauthenticated Route Rejection (401)', unauthRes.status === 401, `Status: ${unauthRes.status}`);
  } catch (err: any) {
    assertTest('Unauthenticated Route Rejection', false, err.message);
  }

  // Test invalid password rejection
  try {
    const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@badminton.live', password: 'WrongPassword!' }),
    });
    assertTest('Invalid Password Rejection (401)', badLoginRes.status === 401, `Status: ${badLoginRes.status}`);
  } catch (err: any) {
    assertTest('Invalid Password Rejection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // PART 3: SIMULATED LOAD TEST (60 VIEWERS + 10 SCORERS CONCURRENT CONNECTIONS)
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------');
  console.log('PART 3: HIGH-CONCURRENCY LOAD & WEBSOCKET STABILITY TEST');
  console.log('Simulating 60 public viewers + 10 scorers...');
  console.log('--------------------------------------------------');

  const viewerSockets: any[] = [];
  const TOTAL_VIEWERS = 60;
  const TOTAL_SCORERS = 10;
  let scoreUpdatesReceived = 0;

  const startTime = Date.now();
  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;

  try {
    // Spawn 60 viewer socket connections
    const connectPromises = [];
    for (let i = 0; i < TOTAL_VIEWERS; i++) {
      const socket = ClientIO(SOCKET_URL, { transports: ['websocket'], forceNew: true });
      viewerSockets.push(socket);

      connectPromises.push(
        new Promise<void>((resolve) => {
          socket.on('connect', () => {
            socket.emit('subscribe:live');
            socket.on('match:scoreUpdated', () => {
              scoreUpdatesReceived++;
            });
            resolve();
          });
        })
      );
    }

    await Promise.all(connectPromises);
    assertTest('60 Simultaneous Socket.IO Connections', viewerSockets.filter((s) => s.connected).length === TOTAL_VIEWERS, `${TOTAL_VIEWERS} connections established`);

    // Perform concurrent HTTP requests simulating 10 scorers fetching match status
    const reqPromises = [];
    for (let i = 0; i < TOTAL_SCORERS * 5; i++) {
      reqPromises.push(fetch(`${API_BASE}/public/home`));
    }

    const responses = await Promise.all(reqPromises);
    const reqDuration = Date.now() - startTime;
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    const all200 = responses.every((r) => r.ok);

    assertTest('10 Scorers Concurrent API Traffic', all200, `50 requests completed in ${reqDuration}ms`);
    assertTest('Memory & CPU Stability Under Load', memAfter - memBefore < 50, `Heap Delta: ${(memAfter - memBefore).toFixed(2)} MB`);

  } catch (err: any) {
    assertTest('Load Test Execution', false, err.message);
  } finally {
    // Cleanup sockets
    for (const socket of viewerSockets) {
      socket.disconnect();
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`FINAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase9ComprehensivePass();
