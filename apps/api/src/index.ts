import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './socket';
import { prisma } from '@badminton-live/database';

import { globalLimiter } from './middleware/rateLimiter';

const app = express();

// Security and middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express routes
app.use(router);

// Global Error Handler
app.use(errorHandler);

// HTTP Server + Socket.IO Initialization
const server = http.createServer(app);
initSocket(server);

// Start Server
const PORT = env.PORT;
server.listen(PORT, () => {
  console.log(`[Badminton Live API] Server listening on port ${PORT} (${env.NODE_ENV})`);
  console.log(`[Badminton Live API] Health check endpoint: http://localhost:${PORT}/health`);
});

// Graceful Shutdown Handler
async function gracefulShutdown(signal: string) {
  console.log(`[Badminton Live API] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[Badminton Live API] HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('[Badminton Live API] Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('[Badminton Live API] Error disconnecting database:', err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
