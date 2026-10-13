// src/server/sales-control/copy-version-content.ts
// Copia lotes, líneas y leasing de una versión a otra en BORRADOR (duplicar CV, nueva versión).
// POR QUÉ: una versión nueva del mismo CV (sameSale) conserva los seriales y el linaje de cada línea, que
// enlaza su bolsa de horas (§2.4); un CV duplicado no, porque es otra venta con otras entregas y bolsas.
import type { Tx } from "@/server/db";

export async function copyVersionContent(
  tx: Tx,
  sourceVersionId: string,
  targetVersionId: string,
  { sameSale }: { sameSale: boolean },
): Promise<void> {
  const [groups, lines, leasingLines] = await Promise.all([
    tx.cvGroup.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { position: "asc" },
    }),
    tx.cvLine.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { position: "asc" },
      include: { serials: true },
    }),
    tx.cvLeasingLine.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { position: "asc" },
    }),
  ]);

  const groupIds = new Map<string, string>();
  for (const group of groups) {
    const created = await tx.cvGroup.create({
      data: {
        versionId: targetVersionId,
        name: group.name,
        position: group.position,
        factor: group.factor,
      },
    });
    groupIds.set(group.id, created.id);
  }
  for (const {
    id,
    versionId: _from,
    groupId,
    hourBagSpec,
    originLineId,
    serials,
    ...line
  } of lines) {
    await tx.cvLine.create({
      data: {
        ...line,
        versionId: targetVersionId,
        groupId: groupId ? (groupIds.get(groupId) ?? null) : null,
        hourBagSpec: hourBagSpec ?? undefined,
        originLineId: sameSale ? (originLineId ?? id) : null,
        serials: sameSale
          ? { create: serials.map(({ serial }) => ({ serial })) }
          : undefined,
      },
    });
  }
  await tx.cvLeasingLine.createMany({
    data: leasingLines.map(({ id: _id, versionId: _from, ...line }) => ({
      ...line,
      versionId: targetVersionId,
    })),
  });
}
