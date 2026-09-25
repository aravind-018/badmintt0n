import { Router } from 'express';
import { login, logout, getCurrentUser, refreshToken } from '../controllers/authController';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

// Public routes
authRouter.post('/login', authLimiter, login);
authRouter.post('/refresh', refreshToken);

// Protected routes
authRouter.use(authenticateToken);
authRouter.post('/logout', logout);
authRouter.get('/me', getCurrentUser);

// Protected role test routes (for Phase 2 verification)
authRouter.get('/admin-only', requireRole('SUPER_ADMIN', 'TOURNAMENT_ADMIN'), (req: AuthRequest, res) => {
  res.json({
    message: 'Welcome to Admin Authorized Endpoint!',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

authRouter.get('/scorer-only', requireRole('SCORER', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN'), (req: AuthRequest, res) => {
  res.json({
    message: 'Welcome to Scorer Authorized Endpoint!',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});
