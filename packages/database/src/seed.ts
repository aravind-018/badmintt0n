import { prisma } from './index';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '../../.env') });

async function main() {
  console.log('[Seed] Seeding database with users and Tharangam Badminton Championship 2026 demo data...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@badminton.live';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  // 1. Seed SUPER_ADMIN
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  // 2. Seed TOURNAMENT_ADMIN
  const tournamentAdminPasswordHash = await bcrypt.hash('TournamentPassword123!', 10);
  await prisma.user.upsert({
    where: { email: 'tournament@badminton.live' },
    update: { passwordHash: tournamentAdminPasswordHash, role: 'TOURNAMENT_ADMIN', isActive: true },
    create: {
      email: 'tournament@badminton.live',
      name: 'Tournament Director',
      passwordHash: tournamentAdminPasswordHash,
      role: 'TOURNAMENT_ADMIN',
      isActive: true,
    },
  });

  // 3. Seed SCORER
  const scorer = await prisma.user.upsert({
    where: { email: 'scorer@badminton.live' },
    update: { passwordHash: await bcrypt.hash('ScorerPassword123!', 10), role: 'SCORER', isActive: true },
    create: {
      email: 'scorer@badminton.live',
      name: 'Official Court Scorer',
      passwordHash: await bcrypt.hash('ScorerPassword123!', 10),
      role: 'SCORER',
      isActive: true,
    },
  });

  // 4. Seed Primary Demo Tournament: Tharangam Badminton Championship 2026
  const tharangamTournament = await prisma.tournament.upsert({
    where: { slug: 'tharangam-championship-2026' },
    update: {
      name: 'Tharangam Badminton Championship 2026',
      description: 'Grand regional badminton tournament featuring elite singles & doubles categories across 4 courts.',
      venue: 'Tharangam Indoor Sports Complex, Main Arena',
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-10-22'),
      status: 'ACTIVE',
      format: 'GROUP_KNOCKOUT',
      numberOfCourts: 4,
      createdById: superAdmin.id,
    },
    create: {
      slug: 'tharangam-championship-2026',
      name: 'Tharangam Badminton Championship 2026',
      description: 'Grand regional badminton tournament featuring elite singles & doubles categories across 4 courts.',
      venue: 'Tharangam Indoor Sports Complex, Main Arena',
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-10-22'),
      status: 'ACTIVE',
      format: 'GROUP_KNOCKOUT',
      numberOfCourts: 4,
      createdById: superAdmin.id,
    },
  });

  // 5. Seed Multiple Categories
  const catMS = await prisma.category.upsert({
    where: { tournamentId_type: { tournamentId: tharangamTournament.id, type: 'MENS_SINGLES' } },
    update: {},
    create: { tournamentId: tharangamTournament.id, type: 'MENS_SINGLES' },
  });

  const catWS = await prisma.category.upsert({
    where: { tournamentId_type: { tournamentId: tharangamTournament.id, type: 'WOMENS_SINGLES' } },
    update: {},
    create: { tournamentId: tharangamTournament.id, type: 'WOMENS_SINGLES' },
  });

  const catMD = await prisma.category.upsert({
    where: { tournamentId_type: { tournamentId: tharangamTournament.id, type: 'MENS_DOUBLES' } },
    update: {},
    create: { tournamentId: tharangamTournament.id, type: 'MENS_DOUBLES' },
  });

  // 6. Seed Several Courts
  const court1 = await prisma.court.upsert({
    where: { id: 'tharangam-court-1' },
    update: { name: 'Court 1 (Center Court)', status: 'IN_USE' },
    create: { id: 'tharangam-court-1', tournamentId: tharangamTournament.id, name: 'Court 1 (Center Court)', location: 'Main Arena Floor', status: 'IN_USE' },
  });

  const court2 = await prisma.court.upsert({
    where: { id: 'tharangam-court-2' },
    update: { name: 'Court 2', status: 'IN_USE' },
    create: { id: 'tharangam-court-2', tournamentId: tharangamTournament.id, name: 'Court 2', location: 'Main Arena Floor', status: 'IN_USE' },
  });

  const court3 = await prisma.court.upsert({
    where: { id: 'tharangam-court-3' },
    update: { name: 'Court 3', status: 'AVAILABLE' },
    create: { id: 'tharangam-court-3', tournamentId: tharangamTournament.id, name: 'Court 3', location: 'Side Arena', status: 'AVAILABLE' },
  });

  const court4 = await prisma.court.upsert({
    where: { id: 'tharangam-court-4' },
    update: { name: 'Court 4', status: 'AVAILABLE' },
    create: { id: 'tharangam-court-4', tournamentId: tharangamTournament.id, name: 'Court 4', location: 'Side Arena', status: 'AVAILABLE' },
  });

  // 7. Seed 8 Roster Players
  const p1 = await prisma.player.upsert({ where: { id: 'th-p1' }, update: {}, create: { id: 'th-p1', name: 'Viktor Axelsen', gender: 'MALE', seed: 1, ranking: 1 } });
  const p2 = await prisma.player.upsert({ where: { id: 'th-p2' }, update: {}, create: { id: 'th-p2', name: 'Shi Yuqi', gender: 'MALE', seed: 2, ranking: 2 } });
  const p3 = await prisma.player.upsert({ where: { id: 'th-p3' }, update: {}, create: { id: 'th-p3', name: 'Anders Antonsen', gender: 'MALE', seed: 3, ranking: 3 } });
  const p4 = await prisma.player.upsert({ where: { id: 'th-p4' }, update: {}, create: { id: 'th-p4', name: 'Kento Momota', gender: 'MALE', seed: 4, ranking: 4 } });
  const p5 = await prisma.player.upsert({ where: { id: 'th-p5' }, update: {}, create: { id: 'th-p5', name: 'An Se-young', gender: 'FEMALE', seed: 1, ranking: 1 } });
  const p6 = await prisma.player.upsert({ where: { id: 'th-p6' }, update: {}, create: { id: 'th-p6', name: 'Chen Yufei', gender: 'FEMALE', seed: 2, ranking: 2 } });
  const p7 = await prisma.player.upsert({ where: { id: 'th-p7' }, update: {}, create: { id: 'th-p7', name: 'Tai Tzu-ying', gender: 'FEMALE', seed: 3, ranking: 3 } });
  const p8 = await prisma.player.upsert({ where: { id: 'th-p8' }, update: {}, create: { id: 'th-p8', name: 'Akane Yamaguchi', gender: 'FEMALE', seed: 4, ranking: 4 } });

  // 8. Seed Fixtures across states (LIVE, COMPLETED, SCHEDULED)
  await prisma.match.deleteMany({ where: { tournamentId: tharangamTournament.id } });

  // LIVE Match 1 on Court 1 (Men's Singles Final Preview)
  const liveMatch1 = await prisma.match.create({
    data: {
      id: 'th-match-live-1',
      tournamentId: tharangamTournament.id,
      categoryId: catMS.id,
      round: 'Semi Final 1',
      scheduledAt: new Date(Date.now() - 1800000),
      courtId: court1.id,
      sideAType: 'PLAYER',
      sideAId: p1.id,
      sideAName: p1.name,
      sideBType: 'PLAYER',
      sideBId: p4.id,
      sideBName: p4.name,
      status: 'LIVE',
      sideAGamesWon: 1,
      sideBGamesWon: 0,
      currentGameState: [
        { gameNumber: 1, sideAPoints: 21, sideBPoints: 17, isComplete: true, winner: 'A' },
        { gameNumber: 2, sideAPoints: 14, sideBPoints: 12, isComplete: false },
      ],
    },
  });

  // Add scoring games & events for LIVE Match 1
  await prisma.matchGame.createMany({
    data: [
      { matchId: liveMatch1.id, gameNumber: 1, sideAPoints: 21, sideBPoints: 17, winnerId: p1.id, completedAt: new Date() },
      { matchId: liveMatch1.id, gameNumber: 2, sideAPoints: 14, sideBPoints: 12 },
    ],
  });

  // LIVE Match 2 on Court 2 (Women's Singles Semi Final)
  const liveMatch2 = await prisma.match.create({
    data: {
      id: 'th-match-live-2',
      tournamentId: tharangamTournament.id,
      categoryId: catWS.id,
      round: 'Semi Final 1',
      scheduledAt: new Date(Date.now() - 1200000),
      courtId: court2.id,
      sideAType: 'PLAYER',
      sideAId: p5.id,
      sideAName: p5.name,
      sideBType: 'PLAYER',
      sideBId: p8.id,
      sideBName: p8.name,
      status: 'LIVE',
      sideAGamesWon: 0,
      sideBGamesWon: 0,
      currentGameState: [
        { gameNumber: 1, sideAPoints: 18, sideBPoints: 19, isComplete: false },
      ],
    },
  });

  await prisma.matchGame.create({
    data: { matchId: liveMatch2.id, gameNumber: 1, sideAPoints: 18, sideBPoints: 19 },
  });

  // Completed Matches
  const compMatch1 = await prisma.match.create({
    data: {
      id: 'th-match-comp-1',
      tournamentId: tharangamTournament.id,
      categoryId: catMS.id,
      round: 'Quarter Final 1',
      scheduledAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 3600000),
      courtId: court1.id,
      sideAType: 'PLAYER',
      sideAId: p1.id,
      sideAName: p1.name,
      sideBType: 'PLAYER',
      sideBId: p3.id,
      sideBName: p3.name,
      status: 'COMPLETED',
      winnerId: p1.id,
      sideAGamesWon: 2,
      sideBGamesWon: 0,
      currentGameState: [
        { gameNumber: 1, sideAPoints: 21, sideBPoints: 15, isComplete: true, winner: 'A' },
        { gameNumber: 2, sideAPoints: 21, sideBPoints: 18, isComplete: true, winner: 'A' },
      ],
    },
  });

  await prisma.matchGame.createMany({
    data: [
      { matchId: compMatch1.id, gameNumber: 1, sideAPoints: 21, sideBPoints: 15, winnerId: p1.id, completedAt: new Date() },
      { matchId: compMatch1.id, gameNumber: 2, sideAPoints: 21, sideBPoints: 18, winnerId: p1.id, completedAt: new Date() },
    ],
  });

  const compMatch2 = await prisma.match.create({
    data: {
      id: 'th-match-comp-2',
      tournamentId: tharangamTournament.id,
      categoryId: catWS.id,
      round: 'Quarter Final 1',
      scheduledAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 3600000),
      courtId: court2.id,
      sideAType: 'PLAYER',
      sideAId: p6.id,
      sideAName: p6.name,
      sideBType: 'PLAYER',
      sideBId: p7.id,
      sideBName: p7.name,
      status: 'COMPLETED',
      winnerId: p6.id,
      sideAGamesWon: 2,
      sideBGamesWon: 1,
      currentGameState: [
        { gameNumber: 1, sideAPoints: 19, sideBPoints: 21, isComplete: true, winner: 'B' },
        { gameNumber: 2, sideAPoints: 21, sideBPoints: 14, isComplete: true, winner: 'A' },
        { gameNumber: 3, sideAPoints: 21, sideBPoints: 16, isComplete: true, winner: 'A' },
      ],
    },
  });

  await prisma.matchGame.createMany({
    data: [
      { matchId: compMatch2.id, gameNumber: 1, sideAPoints: 19, sideBPoints: 21, winnerId: p7.id, completedAt: new Date() },
      { matchId: compMatch2.id, gameNumber: 2, sideAPoints: 21, sideBPoints: 14, winnerId: p6.id, completedAt: new Date() },
      { matchId: compMatch2.id, gameNumber: 3, sideAPoints: 21, sideBPoints: 16, winnerId: p6.id, completedAt: new Date() },
    ],
  });

  // Upcoming Matches
  await prisma.match.create({
    data: {
      id: 'th-match-up-1',
      tournamentId: tharangamTournament.id,
      categoryId: catMS.id,
      round: 'Grand Final',
      scheduledAt: new Date(Date.now() + 86400000),
      courtId: court1.id,
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'Winner SF1',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'Winner SF2',
      status: 'SCHEDULED',
    },
  });

  await prisma.match.create({
    data: {
      id: 'th-match-up-2',
      tournamentId: tharangamTournament.id,
      categoryId: catMD.id,
      round: 'Doubles Final',
      scheduledAt: new Date(Date.now() + 90000000),
      courtId: court3.id,
      sideAType: 'PLAYER',
      sideAId: 'TBD',
      sideAName: 'Alfian / Ardianto',
      sideBType: 'PLAYER',
      sideBId: 'TBD',
      sideBName: 'Kang / Seo',
      status: 'SCHEDULED',
    },
  });

  // 9. Seed Official Tournament Announcement
  await prisma.announcement.create({
    data: {
      tournamentId: tharangamTournament.id,
      title: 'Welcome to Tharangam Badminton Championship 2026',
      body: 'Matches are officially under way across Courts 1 & 2! Check live scores, standings, and scan QR codes for instant mobile tracking.',
      publishedAt: new Date(),
      createdById: superAdmin.id,
    },
  });

  console.log('[Seed] Tharangam Badminton Championship 2026 demo data seeded cleanly! 🏸🏆');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
