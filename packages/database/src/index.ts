import { PrismaClient } from './generated/prisma';

// ---------------------------------------------------------------------------
// Singleton PrismaClient — prevents multiple instances during hot reload
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export generated types
export * from './generated/prisma';
export { PrismaClient } from './generated/prisma';
