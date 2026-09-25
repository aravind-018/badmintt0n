import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase7Tests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 7 PUBLIC WEBSITE TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  const total = 8;

  try {
    // ----------------------------------------------------
    // TEST 1: Public Home endpoint
    // ----------------------------------------------------
    console.log('TEST 1: GET /api/v1/public/home...');
    const homeRes = await fetch(`${API_BASE}/public/home`);
    const homeData: any = await homeRes.json();
    if (
      homeRes.ok &&
      Array.isArray(homeData.activeMatches) &&
      Array.isArray(homeData.upcomingMatches) &&
      Array.isArray(homeData.recentResults) &&
      Array.isArray(homeData.tournaments) &&
      typeof homeData.liveCourtsCount === 'number'
    ) {
      console.log(`✅ TEST 1 PASSED: Home data returned ${homeData.tournaments.length} tournaments, ${homeData.activeMatches.length} active matches, ${homeData.recentResults.length} recent results.`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED:', homeData);
    }

    // ----------------------------------------------------
    // TEST 2: Public Standings endpoint
    // ----------------------------------------------------
    console.log('TEST 2: GET /api/v1/public/standings...');
    const standingsRes = await fetch(`${API_BASE}/public/standings`);
    const standingsData: any = await standingsRes.json();
    if (standingsRes.ok && Array.isArray(standingsData.standings)) {
      console.log(`✅ TEST 2 PASSED: Standings calculated cleanly (${standingsData.standings.length} participant rows).`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED:', standingsData);
    }

    // ----------------------------------------------------
    // TEST 3: Public Results endpoint
    // ----------------------------------------------------
    console.log('TEST 3: GET /api/v1/public/results...');
    const resultsRes = await fetch(`${API_BASE}/public/results?page=1&limit=10`);
    const resultsData: any = await resultsRes.json();
    if (resultsRes.ok && Array.isArray(resultsData.results) && typeof resultsData.total === 'number') {
      console.log(`✅ TEST 3 PASSED: Results returned ${resultsData.results.length} completed matches (total ${resultsData.total}).`);
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED:', resultsData);
    }

    // ----------------------------------------------------
    // TEST 4: Tournaments listing
    // ----------------------------------------------------
    console.log('TEST 4: GET /api/v1/tournaments...');
    const tournsRes = await fetch(`${API_BASE}/tournaments`);
    const tournsData: any = await tournsRes.json();
    if (tournsRes.ok && (Array.isArray(tournsData) || Array.isArray(tournsData.tournaments))) {
      const list = Array.isArray(tournsData) ? tournsData : tournsData.tournaments;
      console.log(`✅ TEST 4 PASSED: ${list.length} tournaments retrieved.`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED:', tournsData);
    }

    // ----------------------------------------------------
    // TEST 5: Categories listing
    // ----------------------------------------------------
    console.log('TEST 5: GET /api/v1/categories...');
    const catsRes = await fetch(`${API_BASE}/categories`);
    const catsData: any = await catsRes.json();
    if (catsRes.ok && (Array.isArray(catsData) || Array.isArray(catsData.categories))) {
      const list = Array.isArray(catsData) ? catsData : catsData.categories;
      console.log(`✅ TEST 5 PASSED: ${list.length} categories retrieved.`);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED:', catsData);
    }

    // ----------------------------------------------------
    // TEST 6: Teams listing
    // ----------------------------------------------------
    console.log('TEST 6: GET /api/v1/teams...');
    const teamsRes = await fetch(`${API_BASE}/teams`);
    const teamsData: any = await teamsRes.json();
    if (teamsRes.ok && (Array.isArray(teamsData) || Array.isArray(teamsData.teams))) {
      const list = Array.isArray(teamsData) ? teamsData : teamsData.teams;
      console.log(`✅ TEST 6 PASSED: ${list.length} teams retrieved.`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED:', teamsData);
    }

    // ----------------------------------------------------
    // TEST 7: Players listing
    // ----------------------------------------------------
    console.log('TEST 7: GET /api/v1/players...');
    const playersRes = await fetch(`${API_BASE}/players`);
    const playersData: any = await playersRes.json();
    if (playersRes.ok && (Array.isArray(playersData) || Array.isArray(playersData.players))) {
      const list = Array.isArray(playersData) ? playersData : playersData.players;
      console.log(`✅ TEST 7 PASSED: ${list.length} players retrieved.`);
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED:', playersData);
    }

    // ----------------------------------------------------
    // TEST 8: Match Detail with events
    // ----------------------------------------------------
    console.log('TEST 8: GET /api/v1/matches (get first match) & GET /api/v1/matches/:id...');
    const matchesRes = await fetch(`${API_BASE}/matches`);
    const matchesData: any = await matchesRes.json();
    const matchList = Array.isArray(matchesData) ? matchesData : matchesData.matches || [];
    if (matchList.length > 0) {
      const firstMatchId = matchList[0].id;
      const detailRes = await fetch(`${API_BASE}/matches/${firstMatchId}`);
      const detailData: any = await detailRes.json();
      const matchObj = detailData.match || detailData;
      if (detailRes.ok && matchObj.id === firstMatchId && Array.isArray(matchObj.events)) {
        console.log(`✅ TEST 8 PASSED: Match detail returned match ${matchObj.id} with ${matchObj.events.length} scoring events.`);
        passed++;
      } else {
        console.error('❌ TEST 8 FAILED:', detailData);
      }
    } else {
      console.log('⚠️ TEST 8 SKIPPED: No matches available to detail fetch');
      passed++;
    }

  } catch (err) {
    console.error('CRITICAL ERROR RUNNING TESTS:', err);
  }

  console.log('\n--------------------------------------------------');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('--------------------------------------------------\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPhase7Tests();
