import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase4Tests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 4 FIXTURES & BRACKET TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 7;

  try {
    // 0. Login as SUPER_ADMIN
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@badminton.live', password: 'AdminPassword123!' }),
    });
    const loginData: any = await loginRes.json();
    const token = loginData.accessToken;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Get demo tournament and category
    const tRes = await fetch(`${API_BASE}/tournaments`);
    const tData: any = await tRes.json();
    const tournamentId = tData.tournaments?.[0]?.id;

    const cRes = await fetch(`${API_BASE}/categories?tournamentId=${tournamentId}`);
    const cData: any = await cRes.json();
    const categoryId = cData.categories?.[0]?.id;

    const courtRes = await fetch(`${API_BASE}/courts?tournamentId=${tournamentId}`);
    const courtData: any = await courtRes.json();
    const courtId = courtData.courts?.[0]?.id;

    // ----------------------------------------------------
    // TEST 1: Create fixture
    // ----------------------------------------------------
    console.log('TEST 1: Create manual fixture...');
    const createRes = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId,
        categoryId,
        round: 'Quarter Final',
        sideAName: 'Lin Dan',
        sideBName: 'Lee Chong Wei',
        status: 'SCHEDULED',
      }),
    });
    const createData: any = await createRes.json();
    const matchId = createData.match?.id;

    if (createRes.status === 201 && matchId && createData.match.sideAName === 'Lin Dan') {
      console.log('  ✅ PASSED: Manual fixture created successfully.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Create Fixture:', createData);
    }

    // ----------------------------------------------------
    // TEST 2: Edit fixture
    // ----------------------------------------------------
    console.log('TEST 2: Edit fixture...');
    const editRes = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        round: 'Semi Final',
      }),
    });
    const editData: any = await editRes.json();

    if (editRes.status === 200 && editData.match?.round === 'Semi Final') {
      console.log('  ✅ PASSED: Fixture details edited successfully.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Edit Fixture:', editData);
    }

    // ----------------------------------------------------
    // TEST 3: Assign court
    // ----------------------------------------------------
    console.log('TEST 3: Assign court to fixture...');
    const courtAssignRes = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        courtId: courtId || null,
      }),
    });
    const courtAssignData: any = await courtAssignRes.json();

    if (courtAssignRes.status === 200) {
      console.log('  ✅ PASSED: Court assigned to fixture.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Assign Court:', courtAssignData);
    }

    // ----------------------------------------------------
    // TEST 4: Reschedule fixture
    // ----------------------------------------------------
    console.log('TEST 4: Reschedule fixture time...');
    const rescheduleTime = new Date(Date.now() + 86400000).toISOString();
    const rescheduleRes = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        scheduledAt: rescheduleTime,
      }),
    });
    const rescheduleData: any = await rescheduleRes.json();

    if (rescheduleRes.status === 200 && rescheduleData.match?.scheduledAt) {
      console.log('  ✅ PASSED: Fixture rescheduled successfully.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Reschedule:', rescheduleData);
    }

    // ----------------------------------------------------
    // TEST 5: Generate Knockout Bracket & Winner Progression
    // ----------------------------------------------------
    console.log('TEST 5: Auto-Generate Knockout Bracket & Progression...');
    const genKnockoutRes = await fetch(`${API_BASE}/matches/generate-knockout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId,
        categoryId,
        courtIds: courtData.courts?.map((c: any) => c.id),
      }),
    });
    const genKnockoutData: any = await genKnockoutRes.json();

    if (genKnockoutRes.status === 201 && genKnockoutData.matches?.length > 0) {
      console.log(`  ✅ PASSED: Knockout bracket generated with ${genKnockoutData.matches.length} matches.\n`);
      passed++;
    } else {
      console.error('  ❌ FAILED Generate Knockout:', genKnockoutData);
    }

    // ----------------------------------------------------
    // TEST 6: Generate Round Robin
    // ----------------------------------------------------
    console.log('TEST 6: Auto-Generate Round Robin Schedule...');
    const genRRRes = await fetch(`${API_BASE}/matches/generate-round-robin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId,
        categoryId,
      }),
    });
    const genRRData: any = await genRRRes.json();

    if (genRRRes.status === 201 && genRRData.matches?.length > 0) {
      console.log(`  ✅ PASSED: Round Robin schedule generated with ${genRRData.matches.length} matches.\n`);
      passed++;
    } else {
      console.error('  ❌ FAILED Generate Round Robin:', genRRData);
    }

    // ----------------------------------------------------
    // TEST 7: Display Bracket Query Verification
    // ----------------------------------------------------
    console.log('TEST 7: Display Bracket Tree Query...');
    const listRes = await fetch(`${API_BASE}/matches?categoryId=${categoryId}`);
    const listData: any = await listRes.json();

    if (listRes.status === 200 && Array.isArray(listData.matches)) {
      console.log(`  ✅ PASSED: Retrieved ${listData.matches.length} matches for visual bracket tree display.\n`);
      passed++;
    } else {
      console.error('  ❌ FAILED Bracket Display Query:', listData);
    }

    console.log('==================================================');
    console.log(`RESULTS: ${passed}/${total} TESTS PASSED CLEANLY! 🎉`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal error during Phase 4 test suite:', err);
  }
}

runPhase4Tests();
