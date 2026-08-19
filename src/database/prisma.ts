import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.VERCEL
  ? (process.env.DATABASE_URL || 'file:/tmp/dev.db')
  : (process.env.DATABASE_URL || 'file:./dev.db');

export type ExtendedPrismaClient = PrismaClient & {
  [key: string]: any;
};

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
}) as ExtendedPrismaClient;

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
