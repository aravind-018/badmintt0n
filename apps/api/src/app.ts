import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';

const app = express();

// Trust proxy layer (1 hop for Vercel Edge Proxy)
app.set('trust proxy', 1);

// Security and middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, serverless, same-origin)
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGIN === '*' || origin === env.CORS_ORIGIN) return callback(null, true);
      if (origin.endsWith('.vercel.app') || origin.includes('localhost')) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express routes
app.use(router);

// Socket.io fallback route for serverless deployments (Vercel)
app.use('/socket.io', (_req, res) => {
  res.status(200).json({ status: 'serverless_mode', message: 'Real-time Socket.IO unavailable in serverless mode; REST fallback active.' });
});

// Global Error Handler
app.use(errorHandler);

export { app };
export default app;
