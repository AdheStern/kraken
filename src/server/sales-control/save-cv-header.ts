// src/server/sales-control/save-cv-header.ts
// Guarda la cabecera de una versión. Fuera de BORRADOR no toca los TC, audita lo que cambió y lo copia a la
// versión posterior aún sin aprobar (AGENTS.md §2.3, decisión 2026-11-03).
import type { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/server/audit/record-audit";
import type { Tx } from "@/server/db";
import { findFollowingVersion } from "./find-following-version";

export type CvHeaderRecord = {
  title: string;
  issuedOn: Date;
  presalesId: string | null;
  postsalesId: string | null;
  mainTechnologyId: string | null;
  serviceTypeId: string | null;
  isNewTechnology: boolean;
  endCustomerId: string | null;
  customerSnapshot: Prisma.InputJsonValue;
  customerPoNumber: string | null;
  customerPoDate: Date | null;
  paymentTerms: string | null;
  deliveryOn: Date | null;
  notes: string | null;
};

type HeaderChange = {
  versionId: string;
  cvId: string;
  isDraft: boolean;
  header: CvHeaderRecord;
  sellerIds: string[];
  // Solo en el borrador; fuera de él el TC de costo y el de venta no cambian.
  fx: { costFxRate: string; saleFxRate: string } | null;
  actorId: string;
};

const FIELDS = [
  "title",
  "issuedOn",
  "presalesId",
  "postsalesId",
  "mainTechnologyId",
  "serviceTypeId",
  "isNewTechnology",
  "endCustomerId",
  "customerSnapshot",
  "customerPoNumber",
  "customerPoDate",
  "paymentTerms",
  "deliveryOn",
  "notes",
] as const satisfies readonly (keyof CvHeaderRecord)[];

export async function saveCvHeader(tx: Tx, change: HeaderChange) {
  const before = await tx.cvVersion.findUniqueOrThrow({
    where: { id: change.versionId },
    select: { ...selectOf(FIELDS), sellers: { select: { userId: true } } },
  });
  await tx.cvVersion.update({
    where: { id: change.versionId },
    data: { ...change.header, ...change.fx },
  });
  await replaceSellers(tx, change.versionId, change.sellerIds);
  if (change.isDraft) return;

  const patch = changedFields(before, change.header);
  const sellersChanged =
    sortedIds(before.sellers.map((s) => s.userId)) !==
    sortedIds(change.sellerIds);
  if (Object.keys(patch).length === 0 && !sellersChanged) return;
  await recordAudit(tx, {
    actorId: change.actorId,
    entity: "cv.version",
    entityId: change.versionId,
    action: "EDITAR_CABECERA",
    before: pick(before, Object.keys(patch)),
    after: { ...patch, ...(sellersChanged && { sellerIds: change.sellerIds }) },
  });
  const following = await findFollowingVersion(
    tx,
    change.cvId,
    change.versionId,
  );
  if (!following) return;
  await tx.cvVersion.update({ where: { id: following.id }, data: patch });
  if (sellersChanged) await replaceSellers(tx, following.id, change.sellerIds);
}

async function replaceSellers(tx: Tx, versionId: string, sellerIds: string[]) {
  await tx.cvVersionSeller.deleteMany({ where: { versionId } });
  await tx.cvVersionSeller.createMany({
    data: [...new Set(sellerIds)].map((userId) => ({ versionId, userId })),
  });
}

function changedFields(
  before: Record<string, unknown>,
  after: CvHeaderRecord,
): Partial<CvHeaderRecord> {
  return Object.fromEntries(
    FIELDS.filter(
      (key) => comparable(before[key]) !== comparable(after[key]),
    ).map((key) => [key, after[key]]),
  );
}

// TRAMPA: jsonb reordena las claves del snapshot; se comparan con las claves ordenadas o todo parece cambiado.
function comparable(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, normalize(v)]),
    );
  return value;
}

function sortedIds(ids: string[]): string {
  return [...new Set(ids)].sort().join(",");
}

function pick(record: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, record[key]]));
}

function selectOf<K extends string>(keys: readonly K[]): Record<K, true> {
  return Object.fromEntries(keys.map((k) => [k, true])) as Record<K, true>;
}
