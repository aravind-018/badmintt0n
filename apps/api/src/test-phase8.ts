import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase8Tests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 8 MANAGEMENT FEATURES TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  const total = 6;

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

    const tRes = await fetch(`${API_BASE}/tournaments`);
    const tData: any = await tRes.json();
    const tournamentId = (Array.isArray(tData) ? tData : tData.tournaments)?.[0]?.id;

    // ----------------------------------------------------
    // TEST 1: Create Announcement (Admin)
    // ----------------------------------------------------
    console.log('TEST 1: Create announcement...');
    const createAnnRes = await fetch(`${API_BASE}/announcements`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        tournamentId,
        title: 'Court 1 Schedule Shift',
        body: 'Matches on Court 1 delayed by 15 minutes due to extended tiebreak.',
        publishedAt: new Date().toISOString(),
      }),
    });
    const createAnnData: any = await createAnnRes.json();
    const announcementId = createAnnData.announcement?.id;

    if (createAnnRes.ok && announcementId && createAnnData.announcement.title === 'Court 1 Schedule Shift') {
      console.log(`✅ TEST 1 PASSED: Announcement created (${announcementId}).`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED:', createAnnData);
    }

    // ----------------------------------------------------
    // TEST 2: Public Viewers See Active Announcements
    // ----------------------------------------------------
    console.log('TEST 2: GET /api/v1/public/home (verify announcement visibility)...');
    const homeRes = await fetch(`${API_BASE}/public/home`);
    const homeData: any = await homeRes.json();
    const foundAnn = (homeData.announcements || []).find((a: any) => a.id === announcementId);

    if (homeRes.ok && foundAnn) {
      console.log(`✅ TEST 2 PASSED: Active announcement found on public home data.`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED:', homeData);
    }

    // ----------------------------------------------------
    // TEST 3: Announcement Publish / Unpublish Toggle & Cleanup
    // ----------------------------------------------------
    console.log('TEST 3: Announcement unpublish & publish toggle...');
    const unpubRes = await fetch(`${API_BASE}/announcements/${announcementId}/unpublish`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const unpubData: any = await unpubRes.json();

    const pubRes = await fetch(`${API_BASE}/announcements/${announcementId}/publish`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const pubData: any = await pubRes.json();

    if (unpubRes.ok && pubRes.ok && pubData.announcement?.publishedAt) {
      console.log(`✅ TEST 3 PASSED: Announcement publish/unpublish toggle succeeded.`);
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED:', unpubData, pubData);
    }

    // ----------------------------------------------------
    // TEST 4: Audit Logs API
    // ----------------------------------------------------
    console.log('TEST 4: GET /api/v1/admin/audit-logs...');
    const auditRes = await fetch(`${API_BASE}/admin/audit-logs?page=1&limit=10`, {
      headers: authHeaders,
    });
    const auditData: any = await auditRes.json();

    if (auditRes.ok && Array.isArray(auditData.logs) && typeof auditData.total === 'number') {
      console.log(`✅ TEST 4 PASSED: ${auditData.logs.length} audit logs retrieved (total ${auditData.total}).`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED:', auditData);
    }

    // ----------------------------------------------------
    // TEST 5: Derived Statistics API
    // ----------------------------------------------------
    console.log('TEST 5: GET /api/v1/admin/stats...');
    const statsRes = await fetch(`${API_BASE}/admin/stats`);
    const statsData: any = await statsRes.json();

    if (
      statsRes.ok &&
      statsData.summary &&
      typeof statsData.summary.matchesTotal === 'number' &&
      Array.isArray(statsData.playerLeaderboard)
    ) {
      console.log(`✅ TEST 5 PASSED: Derived stats computed cleanly (${statsData.summary.matchesTotal} matches, ${statsData.playerLeaderboard.length} player stats).`);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED:', statsData);
    }

    // ----------------------------------------------------
    // TEST 6: Organizer Summary Report API
    // ----------------------------------------------------
    console.log('TEST 6: GET /api/v1/admin/reports/summary...');
    const reportRes = await fetch(`${API_BASE}/admin/reports/summary`, {
      headers: authHeaders,
    });
    const reportData: any = await reportRes.json();

    if (
      reportRes.ok &&
      reportData.generatedAt &&
      Array.isArray(reportData.tournaments) &&
      reportData.statusBreakdown
    ) {
      console.log(`✅ TEST 6 PASSED: Executive summary report generated cleanly.`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED:', reportData);
    }

  } catch (err) {
    console.error('CRITICAL ERROR RUNNING PHASE 8 TESTS:', err);
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

runPhase8Tests();
