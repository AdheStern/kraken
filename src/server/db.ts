// src/server/db.ts
// Cliente Prisma único de la aplicación sobre el adaptador pg (Prisma 7).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// POR QUÉ: en desarrollo el hot reload re-evalúa el módulo; sin el singleton se agotan las conexiones.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
