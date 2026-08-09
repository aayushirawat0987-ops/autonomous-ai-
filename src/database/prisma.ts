import { PrismaClient } from '@prisma/client';

export type ExtendedPrismaClient = PrismaClient & {
  mission: any;
  emergingTrend: any;
};

export const prisma = new PrismaClient() as ExtendedPrismaClient;

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
