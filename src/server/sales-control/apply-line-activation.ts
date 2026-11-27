// src/server/sales-control/apply-line-activation.ts
// Aplica el rango de activación a las licencias de una versión en cualquier estado y copia lo que cambió a la línea
// del mismo linaje de la versión siguiente aún sin aprobar (AGENTS.md §2.3, decisión 2026-11-27).
import type { Tx } from "@/server/db";
import { findFollowingVersion } from "./find-following-version";

export type LineActivationRecord = {
  id: string;
  activationStart: Date | null;
  activationEnd: Date | null;
};
type Change = { before: LineActivationRecord; after: LineActivationRecord };
export type LineActivationResult =
  | { ok: true; changes: Change[] }
  | { ok: false; message: string };

export async function applyLineActivation(
  tx: Tx,
  cvId: string,
  versionId: string,
  records: LineActivationRecord[],
): Promise<LineActivationResult> {
  const current = await tx.cvLine.findMany({
    where: { versionId, id: { in: records.map((r) => r.id) } },
    select: {
      id: true,
      kind: true,
      itemType: true,
      originLineId: true,
      activationStart: true,
      activationEnd: true,
    },
  });
  const byId = new Map(current.map((line) => [line.id, line]));
  const following = await findFollowingVersion(tx, cvId, versionId);
  const changes: Change[] = [];
  for (const record of records) {
    const line = byId.get(record.id);
    if (!line || line.kind !== "ITEM")
      return { ok: false, message: "Una de las líneas ya no está en el CV." };
    const before = {
      id: line.id,
      activationStart: line.activationStart,
      activationEnd: line.activationEnd,
    };
    if (sameRange(before, record)) continue;
    if (record.activationStart && line.itemType !== "INTANGIBLE")
      return {
        ok: false,
        message: "Solo las licencias (tipo Intangible) llevan activación.",
      };
    const data = {
      activationStart: record.activationStart,
      activationEnd: record.activationEnd,
    };
    changes.push({ before, after: record });
    // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
    await tx.cvLine.update({ where: { id: line.id }, data });
    // REGLA: la versión siguiente lo recibe solo si allí la línea sigue siendo una licencia (CHECK de la línea).
    if (following)
      await tx.cvLine.updateMany({
        where: {
          versionId: following.id,
          originLineId: line.originLineId ?? line.id,
          kind: "ITEM",
          itemType: "INTANGIBLE",
        },
        data,
      });
  }
  return { ok: true, changes };
}

function sameRange(a: LineActivationRecord, b: LineActivationRecord): boolean {
  return (
    sameDate(a.activationStart, b.activationStart) &&
    sameDate(a.activationEnd, b.activationEnd)
  );
}

function sameDate(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}
