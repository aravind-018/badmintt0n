import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase3Tests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 3 CRUD AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 7;

  try {
    // Step 0: Authenticate as SUPER_ADMIN
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

    const uniqueSlug = `open-masters-${Date.now()}`;

    // ----------------------------------------------------
    // TEST 1: Tournament CRUD
    // ----------------------------------------------------
    console.log('TEST 1: Tournament CRUD (Create, Read, Update)...');
    const newTournament = {
      name: 'Open Masters Series 2026',
      slug: uniqueSlug,
      venue: 'Olympic Sports Center',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      status: 'PUBLISHED',
      format: 'KNOCKOUT',
      numberOfCourts: 6,
    };

    // Create
    const createTRes = await fetch(`${API_BASE}/tournaments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(newTournament),
    });
    const createTData: any = await createTRes.json();
    const tId = createTData.tournament?.id;

    // Read
    const getTRes = await fetch(`${API_BASE}/tournaments/${tId}`);
    const getTData: any = await getTRes.json();

    // Update
    const updateTRes = await fetch(`${API_BASE}/tournaments/${tId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ venue: 'Olympic Sports Center — Main Court' }),
    });
    const updateTData: any = await updateTRes.json();

    if (
      createTRes.status === 201 &&
      getTRes.status === 200 &&
      updateTData.tournament?.venue.includes('Main Court')
    ) {
      console.log('  ✅ PASSED: Tournament Created, Retrieved, and Updated successfully.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Tournament CRUD:', { createTData, getTData, updateTData });
    }

    // ----------------------------------------------------
    // TEST 2: Category CRUD
    // ----------------------------------------------------
    console.log('TEST 2: Category CRUD (Create, Read)...');
    const createCatRes = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tournamentId: tId, type: 'WOMENS_DOUBLES' }),
    });
    const createCatData: any = await createCatRes.json();
    const catId = createCatData.category?.id;

    const getCatRes = await fetch(`${API_BASE}/categories?tournamentId=${tId}`);
    const getCatData: any = await getCatRes.json();

    if (createCatRes.status === 201 && getCatData.categories?.some((c: any) => c.id === catId)) {
      console.log('  ✅ PASSED: Category Added and Verified for Tournament.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Category CRUD:', { createCatData, getCatData });
    }

    // ----------------------------------------------------
    // TEST 3: Team CRUD
    // ----------------------------------------------------
    console.log('TEST 3: Team CRUD (Create, Read, Update)...');
    const createTeamRes = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId: tId,
        name: 'Phoenix Badminton Club',
        organization: 'Phoenix Sports',
        contactName: 'Coach Dave',
      }),
    });
    const createTeamData: any = await createTeamRes.json();
    const teamId = createTeamData.team?.id;

    const updateTeamRes = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ contactPhone: '+1-555-9988' }),
    });
    const updateTeamData: any = await updateTeamRes.json();

    if (createTeamRes.status === 201 && updateTeamData.team?.contactPhone === '+1-555-9988') {
      console.log('  ✅ PASSED: Team Created and Updated successfully.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Team CRUD:', { createTeamData, updateTeamData });
    }

    // ----------------------------------------------------
    // TEST 4: Player CRUD & Team Assignment
    // ----------------------------------------------------
    console.log('TEST 4: Player CRUD & Team Assignment...');
    const createPlayerRes = await fetch(`${API_BASE}/players`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Lee Zii Jia',
        gender: 'MALE',
        seed: 3,
        ranking: 5,
        teamId: teamId,
      }),
    });
    const createPlayerData: any = await createPlayerRes.json();
    const playerId = createPlayerData.player?.id;

    const getPlayerRes = await fetch(`${API_BASE}/players/${playerId}`);
    const getPlayerData: any = await getPlayerRes.json();

    if (createPlayerRes.status === 201 && getPlayerData.player?.name === 'Lee Zii Jia') {
      console.log('  ✅ PASSED: Player Created & Linked to Team.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Player CRUD:', { createPlayerData, getPlayerData });
    }

    // ----------------------------------------------------
    // TEST 5: Court CRUD
    // ----------------------------------------------------
    console.log('TEST 5: Court CRUD (Create, Read, Update)...');
    const createCourtRes = await fetch(`${API_BASE}/courts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId: tId,
        name: 'Show Court Alpha',
        location: 'VIP Pavilion',
        status: 'AVAILABLE',
      }),
    });
    const createCourtData: any = await createCourtRes.json();
    const courtId = createCourtData.court?.id;

    const updateCourtRes = await fetch(`${API_BASE}/courts/${courtId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'IN_USE' }),
    });
    const updateCourtData: any = await updateCourtRes.json();

    if (createCourtRes.status === 201 && updateCourtData.court?.status === 'IN_USE') {
      console.log('  ✅ PASSED: Court Created & Status Updated.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Court CRUD:', { createCourtData, updateCourtData });
    }

    // ----------------------------------------------------
    // TEST 6: Entity Deletions (Category, Player, Court, Team)
    // ----------------------------------------------------
    console.log('TEST 6: Sub-Entity Deletions (Category, Player, Court, Team)...');
    const delCat = await fetch(`${API_BASE}/categories/${catId}`, { method: 'DELETE', headers: authHeaders });
    const delPlayer = await fetch(`${API_BASE}/players/${playerId}`, { method: 'DELETE', headers: authHeaders });
    const delCourt = await fetch(`${API_BASE}/courts/${courtId}`, { method: 'DELETE', headers: authHeaders });
    const delTeam = await fetch(`${API_BASE}/teams/${teamId}`, { method: 'DELETE', headers: authHeaders });

    if (delCat.status === 200 && delPlayer.status === 200 && delCourt.status === 200 && delTeam.status === 200) {
      console.log('  ✅ PASSED: Sub-entities deleted cleanly.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Sub-Entity Deletions');
    }

    // ----------------------------------------------------
    // TEST 7: Delete Tournament
    // ----------------------------------------------------
    console.log('TEST 7: Delete Tournament...');
    const delTRes = await fetch(`${API_BASE}/tournaments/${tId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (delTRes.status === 200) {
      console.log('  ✅ PASSED: Tournament deleted cleanly.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED Delete Tournament');
    }

    console.log('==================================================');
    console.log(`RESULTS: ${passed}/${total} TESTS PASSED CLEANLY! 🎉`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal error during Phase 3 test suite:', err);
  }
}

runPhase3Tests();
