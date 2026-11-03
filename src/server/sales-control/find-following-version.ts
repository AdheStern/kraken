// src/server/sales-control/find-following-version.ts
// Versión posterior a la aprobada que todavía puede aprobarse (borrador, en aprobación u observada): recibe los
// datos posventa copiados para no perderlos al aprobarla (AGENTS.md §2.3, decisión 2026-11-03).
import type { Tx } from "@/server/db";

export async function findFollowingVersion(
  tx: Tx,
  cvId: string,
  approvedVersionId: string,
): Promise<{ id: string } | null> {
  const approved = await tx.cvVersion.findUniqueOrThrow({
    where: { id: approvedVersionId },
    select: { number: true },
  });
  // TRAMPA: solo la más reciente; una observada con un borrador posterior ya quedó atrás.
  const latest = await tx.cvVersion.findFirst({
    where: { cvId, number: { gt: approved.number } },
    orderBy: { number: "desc" },
    select: { id: true, status: true },
  });
  const pending = ["BORRADOR", "EN_APROBACION", "OBSERVADA"];
  return latest && pending.includes(latest.status) ? { id: latest.id } : null;
}
