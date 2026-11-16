// src/server/sales-control/apply-line-withholdings.ts
// Aplica GROSS UP y RET DIMA a las líneas de una versión en cualquier estado y copia lo que cambió a la línea del
// mismo linaje de la versión siguiente aún sin aprobar (AGENTS.md §2.3, decisión 2026-11-16).
import Decimal from "decimal.js";
import type { Tx } from "@/server/db";
import { findFollowingVersion } from "./find-following-version";

export type LineWithholdingsRecord = {
  id: string;
  grossUpUsd: string | null;
  retDimaUsd: string | null;
};
type Patch = Partial<Omit<LineWithholdingsRecord, "id">>;
type Change = { before: LineWithholdingsRecord; after: LineWithholdingsRecord };
export type LineWithholdingsResult =
  | { ok: true; changes: Change[] }
  | { ok: false; message: string };

export async function applyLineWithholdings(
  tx: Tx,
  cvId: string,
  versionId: string,
  records: LineWithholdingsRecord[],
): Promise<LineWithholdingsResult> {
  const current = await tx.cvLine.findMany({
    where: { versionId, id: { in: records.map((r) => r.id) } },
    select: {
      id: true,
      kind: true,
      originLineId: true,
      grossUpUsd: true,
      retDimaUsd: true,
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
      grossUpUsd: line.grossUpUsd?.toFixed(2) ?? null,
      retDimaUsd: line.retDimaUsd?.toFixed(2) ?? null,
    };
    const patch = diff(before, record);
    if (Object.keys(patch).length === 0) continue;
    changes.push({ before, after: { ...before, ...patch } });
    // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
    await tx.cvLine.update({ where: { id: line.id }, data: patch });
    if (following)
      await tx.cvLine.updateMany({
        where: {
          versionId: following.id,
          originLineId: line.originLineId ?? line.id,
          kind: "ITEM",
        },
        data: patch,
      });
  }
  return { ok: true, changes };
}

// POR QUÉ: se compara el monto, no el texto («10» y «10.00» son lo mismo); solo viaja lo que cambió.
function diff(before: LineWithholdingsRecord, after: LineWithholdingsRecord) {
  const patch: Patch = {};
  if (!sameAmount(before.grossUpUsd, after.grossUpUsd))
    patch.grossUpUsd = after.grossUpUsd;
  if (!sameAmount(before.retDimaUsd, after.retDimaUsd))
    patch.retDimaUsd = after.retDimaUsd;
  return patch;
}

function sameAmount(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return new Decimal(a).equals(b);
}
