import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
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

export { app };
export default app;
