import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { initSocket } from './socket';
import { prisma } from '@badminton-live/database';

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
