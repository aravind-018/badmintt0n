import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from './generated/prisma';

// Ensure .env is loaded before PrismaClient initialization
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(__dirname, '../../../.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  '';

if (dbUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = dbUrl;
}

// ---------------------------------------------------------------------------
// Singleton PrismaClient — prevents multiple instances during hot reload
// & serverless warm execution
// ---------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const clientOptions: any = {
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
};

if (dbUrl) {
  clientOptions.datasources = {
    db: {
      url: dbUrl,
    },
  };
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(clientOptions);

globalForPrisma.prisma = prisma;

// Re-export generated types
export * from './generated/prisma';
export { PrismaClient, Role } from './generated/prisma';
