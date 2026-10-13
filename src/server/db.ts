// src/server/db.ts
// Cliente Prisma único de la aplicación sobre el adaptador pg (Prisma 7) y la unidad de trabajo transaccional.
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// POR QUÉ: en desarrollo el hot reload re-evalúa el módulo; sin el singleton se agotan las conexiones.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;

// REGLA: todo cambio de saldo y su movimiento van en la misma transacción (AGENTS.md regla 6, Unit of Work).
export function runInTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(work);
}
