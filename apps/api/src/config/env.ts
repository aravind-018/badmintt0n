import { config } from 'dotenv';
import path from 'path';

// Load .env from the monorepo root (../../ from apps/api/)
// Then fall back to a local .env if present
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Validated environment configuration
// ---------------------------------------------------------------------------

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

const resolvedDbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  '';

if (resolvedDbUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDbUrl;
}

export const env = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '4000'), 10),
  DATABASE_URL: resolvedDbUrl,
  CORS_ORIGIN: getEnv('CORS_ORIGIN', '*'),
  JWT_SECRET: getEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  isDev: getEnv('NODE_ENV', 'development') === 'development',
  isProd: getEnv('NODE_ENV', 'development') === 'production',
} as const;
