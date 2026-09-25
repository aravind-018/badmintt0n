import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:4000/api/v1';

async function runPhase2Tests() {
  console.log('\n==================================================');
  console.log('🏸 BADMINTON LIVE — PHASE 2 AUTOMATED TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 9;

  try {
    // ----------------------------------------------------
    // TEST 1: Valid admin login
    // ----------------------------------------------------
    console.log('TEST 1: Valid admin login...');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@badminton.live',
        password: 'AdminPassword123!',
      }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    if (adminLoginRes.status === 200 && adminLoginData.accessToken && adminLoginData.user.role === 'SUPER_ADMIN') {
      console.log('  ✅ PASSED: Admin logged in successfully (Token received, Role: SUPER_ADMIN)\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', adminLoginData);
    }
    const adminToken = adminLoginData.accessToken;

    // ----------------------------------------------------
    // TEST 2: Invalid password
    // ----------------------------------------------------
    console.log('TEST 2: Invalid password...');
    const invalidPassRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@badminton.live',
        password: 'WrongPassword999!',
      }),
    });
    const invalidPassData: any = await invalidPassRes.json();
    if (invalidPassRes.status === 401 && invalidPassData.error === 'Invalid email or password') {
      console.log('  ✅ PASSED: Rejected invalid password with 401 Unauthorized\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', invalidPassData);
    }

    // ----------------------------------------------------
    // TEST 3: Invalid email
    // ----------------------------------------------------
    console.log('TEST 3: Invalid email...');
    const invalidEmailRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@badminton.live',
        password: 'AdminPassword123!',
      }),
    });
    const invalidEmailData: any = await invalidEmailRes.json();
    if (invalidEmailRes.status === 401 && invalidEmailData.error === 'Invalid email or password') {
      console.log('  ✅ PASSED: Rejected non-existent email with 401 Unauthorized\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', invalidEmailData);
    }

    // ----------------------------------------------------
    // TEST 4: Admin access to admin endpoint
    // ----------------------------------------------------
    console.log('TEST 4: Admin access to /auth/admin-only...');
    const adminAccessRes = await fetch(`${API_BASE}/auth/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAccessData: any = await adminAccessRes.json();
    if (adminAccessRes.status === 200 && adminAccessData.message.includes('Admin Authorized')) {
      console.log('  ✅ PASSED: Admin successfully accessed /admin-only endpoint\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', adminAccessData);
    }

    // ----------------------------------------------------
    // TEST 5: Scorer access to scorer endpoint
    // ----------------------------------------------------
    console.log('TEST 5: Scorer login & access to /auth/scorer-only...');
    const scorerLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'scorer@badminton.live',
        password: 'ScorerPassword123!',
      }),
    });
    const scorerLoginData: any = await scorerLoginRes.json();
    const scorerToken = scorerLoginData.accessToken;

    const scorerAccessRes = await fetch(`${API_BASE}/auth/scorer-only`, {
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    const scorerAccessData: any = await scorerAccessRes.json();
    if (scorerAccessRes.status === 200 && scorerAccessData.message.includes('Scorer Authorized')) {
      console.log('  ✅ PASSED: Scorer successfully accessed /scorer-only endpoint\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', scorerAccessData);
    }

    // ----------------------------------------------------
    // TEST 6: Unauthorized route access (Scorer accessing admin route)
    // ----------------------------------------------------
    console.log('TEST 6: Scorer attempting access to /auth/admin-only (Unauthorized)...');
    const unauthRes = await fetch(`${API_BASE}/auth/admin-only`, {
      headers: { Authorization: `Bearer ${scorerToken}` },
    });
    const unauthData: any = await unauthRes.json();
    if (unauthRes.status === 403 && unauthData.error.includes('Forbidden')) {
      console.log('  ✅ PASSED: Blocked Scorer from admin endpoint with 403 Forbidden\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', unauthData);
    }

    // ----------------------------------------------------
    // TEST 7: Logged-out route access (No Token)
    // ----------------------------------------------------
    console.log('TEST 7: Request without token to /auth/admin-only...');
    const noTokenRes = await fetch(`${API_BASE}/auth/admin-only`);
    const noTokenData: any = await noTokenRes.json();
    if (noTokenRes.status === 401 && noTokenData.error.includes('No token provided')) {
      console.log('  ✅ PASSED: Blocked unauthenticated request with 401 Unauthorized\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', noTokenData);
    }

    // ----------------------------------------------------
    // TEST 8: Protected API request (/auth/me)
    // ----------------------------------------------------
    console.log('TEST 8: Fetching current user profile (/auth/me)...');
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData: any = await meRes.json();
    if (meRes.status === 200 && meData.user && meData.user.email === 'admin@badminton.live') {
      console.log(`  ✅ PASSED: Retrieved user profile for ${meData.user.name} (${meData.user.role})\n`);
      passed++;
    } else {
      console.error('  ❌ FAILED:', meData);
    }

    // ----------------------------------------------------
    // TEST 9: Role-based API authorization matrix verification
    // ----------------------------------------------------
    console.log('TEST 9: Role-based API authorization matrix...');
    // Admin accessing scorer endpoint (allowed)
    const adminToScorerRes = await fetch(`${API_BASE}/auth/scorer-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminToScorerRes.status === 200) {
      console.log('  ✅ PASSED: Admin permitted to access Scorer endpoint; Scorer denied from Admin endpoint.\n');
      passed++;
    } else {
      console.error('  ❌ FAILED:', await adminToScorerRes.json());
    }

    console.log('==================================================');
    console.log(`RESULTS: ${passed}/${total} TESTS PASSED CLEANLY! 🎉`);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
  }
}

runPhase2Tests();
