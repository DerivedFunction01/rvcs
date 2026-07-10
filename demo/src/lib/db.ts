import 'dotenv/config';
import { PrismaClient } from '../../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  if (databaseUrl.startsWith('file:')) {
    const dbPath = databaseUrl.replace(/^file:/, '');
    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    return new PrismaClient({ adapter, log: ['query'] });
  } else {
    const adapter = new PrismaPg(databaseUrl);
    return new PrismaClient({ adapter, log: ['query'] });
  }
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;