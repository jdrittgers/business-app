import { PrismaClient } from '@prisma/client';
import { softDeleteMiddleware } from '../middleware/prisma-soft-delete.middleware';

// Singleton pattern to prevent multiple Prisma instances
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Apply soft delete middleware
prisma.$use(softDeleteMiddleware());

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
