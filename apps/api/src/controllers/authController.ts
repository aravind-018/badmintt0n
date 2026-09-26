import { Request, Response } from 'express';
import { prisma } from '@badminton-live/database';
import { comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { loginSchema, refreshTokenSchema } from '../schemas/auth';
import { AuthRequest } from '../middleware/auth';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors.map((e) => e.message),
      });
      return;
    }

    const { email, password } = result.data;

    if (!process.env.DATABASE_URL) {
      res.status(503).json({
        error: 'Database connection string (DATABASE_URL) is not configured in environment variables.',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          ipAddress: req.ip || req.socket.remoteAddress,
          metadata: { userAgent: req.headers['user-agent'] },
        },
      });
    } catch (err) {
      console.error('[Auth] Failed to create audit log for login:', err);
    }

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal authentication error',
    });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[Auth] getCurrentUser error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch user' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const result = refreshTokenSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(result.data.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account invalid or inactive' });
      return;
    }

    const newPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  if (req.user) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });
    } catch (err) {
      console.error('[Auth] Failed to create audit log for logout:', err);
    }
  }

  res.json({ message: 'Logged out successfully' });
}
