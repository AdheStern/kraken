// src/server/hours/lock-bags.ts
// Bloquea filas de horas.bolsa (SELECT … FOR UPDATE) y devuelve su saldo, estado y si no tiene tope (ADR-03).
import type { BagStatus } from "@/domain/hours/bag-state-machine";
import { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";

export type LockedBag = {
  balanceMinutes: number;
  status: BagStatus;
  isUncapped: boolean;
};

type Row = {
  id: string;
  saldo_minutos: number;
  estado: BagStatus;
  sin_tope: boolean;
};

// TRAMPA: se bloquea siempre en orden de id; sin un orden fijo, dos cierres que tocan las mismas bolsas
// en distinto orden se bloquean mutuamente.
export async function lockBags(
  tx: Tx,
  bagIds: readonly string[],
): Promise<Map<string, LockedBag>> {
  const ids = [...new Set(bagIds)].sort();
  if (ids.length === 0) return new Map();
  const rows = await tx.$queryRaw<Row[]>`
    SELECT id::text AS id, saldo_minutos, estado::text AS estado, sin_tope
    FROM horas.bolsa
    WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id
    FOR UPDATE`;
  return new Map(
    rows.map((row) => [
      row.id,
      {
        balanceMinutes: row.saldo_minutos,
        status: row.estado,
        isUncapped: row.sin_tope,
      },
    ]),
  );
}
