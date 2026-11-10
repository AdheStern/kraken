// src/server/sales-control/apply-post-sale-leasing.ts
// Aplica notas, seriales y PO# al leasing de una versión APROBADA y los copia al leasing equivalente de la versión
// siguiente aún sin aprobar (AGENTS.md §2.3, decisión 2026-11-03).
import type { Tx } from "@/server/db";
import { findFollowingVersion } from "./find-following-version";

export type PostSaleLeasingRecord = {
  id: string;
  notes: string | null;
  poNumber: string | null;
  serials: string[];
};

type LeasingChange = {
  before: PostSaleLeasingRecord;
  after: PostSaleLeasingRecord;
};
export type PostSaleLeasingResult =
  | { ok: true; changes: LeasingChange[] }
  | { ok: false; message: string };

export async function applyPostSaleLeasing(
  tx: Tx,
  cvId: string,
  versionId: string,
  records: PostSaleLeasingRecord[],
): Promise<PostSaleLeasingResult> {
  const current = await tx.cvLeasingLine.findMany({
    where: { versionId, id: { in: records.map((r) => r.id) } },
  });
  const byId = new Map(current.map((line) => [line.id, line]));
  const following = await findFollowingVersion(tx, cvId, versionId);
  const changes: LeasingChange[] = [];
  for (const record of records) {
    const line = byId.get(record.id);
    if (!line)
      return {
        ok: false,
        message: "Una línea de leasing ya no está en el CV.",
      };
    if (line.quantity.lessThan(record.serials.length))
      return {
        ok: false,
        message: `Leasing, línea ${line.position}: hay más seriales que la cantidad.`,
      };
    const before = {
      id: line.id,
      notes: line.notes,
      poNumber: line.poNumber,
      serials: line.serials,
    };
    // POR QUÉ: a la versión siguiente solo viaja lo que cambió, para no pisar lo que su autor editó en otro campo.
    const patch = {
      ...(line.notes !== record.notes && { notes: record.notes }),
      ...(line.poNumber !== record.poNumber && { poNumber: record.poNumber }),
      ...(line.serials.join("\n") !== record.serials.join("\n") && {
        serials: record.serials,
      }),
    };
    if (Object.keys(patch).length === 0) continue;
    changes.push({ before, after: record });
    // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
    await tx.cvLeasingLine.update({ where: { id: line.id }, data: patch });
    // LIMITACIÓN: el leasing no guarda linaje; en la versión siguiente se reconoce por posición y descripción, y si el
    // autor lo movió o lo reescribió, el cambio no viaja.
    if (following)
      await tx.cvLeasingLine.updateMany({
        where: {
          versionId: following.id,
          position: line.position,
          description: line.description,
        },
        data: patch,
      });
  }
  return { ok: true, changes };
}
