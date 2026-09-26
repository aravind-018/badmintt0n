import { PrismaClient } from './generated/prisma';

// Ensure process.env.DATABASE_URL is set before PrismaClient initialization
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

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

globalForPrisma.prisma = prisma;

// Re-export generated types
export * from './generated/prisma';
export { PrismaClient, Role } from './generated/prisma';
