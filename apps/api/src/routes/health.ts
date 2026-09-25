import { Router, Request, Response } from 'express';
import { prisma } from '@badminton-live/database';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const start = Date.now();

  try {
    // Verify database connectivity with a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: 'connected',
      dbLatencyMs,
      version: '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
      node: process.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: 'disconnected',
      error: message,
      version: '0.1.0',
      environment: process.env.NODE_ENV ?? 'development',
    });
  }
});
