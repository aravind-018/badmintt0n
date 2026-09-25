import { Router, Request, Response } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { tournamentRouter } from './tournaments';
import { categoryRouter } from './categories';
import { teamRouter } from './teams';
import { playerRouter } from './players';
import { courtRouter } from './courts';
import { matchRouter } from './matches';
import { scoringRouter } from './scoring';
import { liveRouter } from './live';
import { publicRouter } from './public';
import { announcementRouter } from './announcements';
import { adminRouter } from './admin';

export const router = Router();

// Health Check
router.use(healthRouter);

// Auth v1 API
router.use('/api/v1/auth', authRouter);

// Domain Resource v1 APIs
router.use('/api/v1/tournaments', tournamentRouter);
router.use('/api/v1/categories', categoryRouter);
router.use('/api/v1/teams', teamRouter);
router.use('/api/v1/players', playerRouter);
router.use('/api/v1/courts', courtRouter);
router.use('/api/v1/matches', matchRouter);
router.use('/api/v1/matches', scoringRouter);
router.use('/api/v1/announcements', announcementRouter);
router.use('/api/v1/admin', adminRouter);

// Live scoreboard
router.use('/api/v1/live', liveRouter);

// Public read-only data endpoints
router.use('/api/v1/public', publicRouter);

// API v1 info root
router.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    name: 'Badminton Live API Server',
    version: '0.1.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});
