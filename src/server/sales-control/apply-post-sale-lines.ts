// src/server/sales-control/apply-post-sale-lines.ts
// Aplica los datos posventa (observaciones, PO#, rango de activación, seriales) a las líneas de una versión
// APROBADA y los copia a la línea del mismo linaje del borrador abierto (AGENTS.md §2.3, decisión 2026-11-03).
import type { Tx } from "@/server/db";

export type PostSaleLineRecord = {
  id: string;
  notes: string | null;
  poNumber: string | null;
  activationStart: Date | null;
  activationEnd: Date | null;
  serials: string[];
};

type LinePatch = Partial<Omit<PostSaleLineRecord, "id">>;
type LineChange = { before: PostSaleLineRecord; after: PostSaleLineRecord };
export type PostSaleLinesResult =
  | { ok: true; changes: LineChange[] }
  | { ok: false; message: string };

export async function applyPostSaleLines(
  tx: Tx,
  cvId: string,
  versionId: string,
  records: PostSaleLineRecord[],
): Promise<PostSaleLinesResult> {
  const current = await tx.cvLine.findMany({
    where: { versionId, id: { in: records.map((r) => r.id) } },
    include: { serials: { orderBy: { id: "asc" } } },
  });
  const byId = new Map(current.map((line) => [line.id, line]));
  const changes: LineChange[] = [];
  const draft = await tx.cvVersion.findFirst({
    where: { cvId, status: "BORRADOR" },
    select: { id: true },
  });
  for (const record of records) {
    const line = byId.get(record.id);
    if (!line || line.kind !== "ITEM")
      return { ok: false, message: "Una de las líneas ya no está en el CV." };
    if (record.activationStart && line.itemType !== "INTANGIBLE")
      return {
        ok: false,
        message: "Solo las licencias (tipo Intangible) llevan activación.",
      };
    const before = { ...line, serials: line.serials.map((s) => s.serial) };
    const patch = diff(before, record);
    if (Object.keys(patch).length === 0) continue;
    changes.push({ before: pick(before), after: record });
    // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
    await writePatch(tx, line.id, patch);
    if (draft)
      await copyToDraft(tx, draft.id, line.originLineId ?? line.id, patch);
  }
  return { ok: true, changes };
}

// POR QUÉ: al borrador solo viaja lo que cambió, para no pisar lo que su autor editó en los demás campos.
async function copyToDraft(
  tx: Tx,
  draftId: string,
  originLineId: string,
  patch: LinePatch,
) {
  const target = await tx.cvLine.findFirst({
    where: { versionId: draftId, originLineId, kind: "ITEM" },
    select: { id: true, itemType: true },
  });
  if (!target) return;
  const { activationStart, activationEnd, ...rest } = patch;
  const keepActivation = target.itemType === "INTANGIBLE";
  await writePatch(
    tx,
    target.id,
    keepActivation ? { ...rest, activationStart, activationEnd } : rest,
  );
}

async function writePatch(tx: Tx, lineId: string, patch: LinePatch) {
  const { serials, ...fields } = patch;
  if (Object.keys(fields).length > 0)
    await tx.cvLine.update({ where: { id: lineId }, data: fields });
  if (!serials) return;
  await tx.cvLineSerial.deleteMany({ where: { lineId } });
  await tx.cvLineSerial.createMany({
    data: [...new Set(serials)].map((serial) => ({ lineId, serial })),
  });
}

function diff(before: PostSaleLineRecord, after: PostSaleLineRecord) {
  const patch: LinePatch = {};
  if (before.notes !== after.notes) patch.notes = after.notes;
  if (before.poNumber !== after.poNumber) patch.poNumber = after.poNumber;
  if (
    !sameDate(before.activationStart, after.activationStart) ||
    !sameDate(before.activationEnd, after.activationEnd)
  ) {
    patch.activationStart = after.activationStart;
    patch.activationEnd = after.activationEnd;
  }
  if (before.serials.join("\n") !== after.serials.join("\n"))
    patch.serials = after.serials;
  return patch;
}

function sameDate(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

function pick(line: PostSaleLineRecord): PostSaleLineRecord {
  const { id, notes, poNumber, activationStart, activationEnd, serials } = line;
  return { id, notes, poNumber, activationStart, activationEnd, serials };
}
