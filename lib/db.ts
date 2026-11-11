import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db: PrismaClient | null = process.env.DATABASE_URL ? (g.prisma ??= new PrismaClient()) : null;
