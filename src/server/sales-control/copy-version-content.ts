// src/server/sales-control/copy-version-content.ts
// Copia lotes, líneas y leasing de una versión a otra en BORRADOR (duplicar CV, nueva versión).
// Los seriales no se copian: pertenecen a la entrega del CV original.
import type { Tx } from "@/server/db";

export async function copyVersionContent(
  tx: Tx,
  sourceVersionId: string,
  targetVersionId: string,
): Promise<void> {
  const [groups, lines, leasingLines] = await Promise.all([
    tx.cvGroup.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { position: "asc" },
    }),
    tx.cvLine.findMany({
      where: { versionId: sourceVersionId },
      orderBy: { position: "asc" },
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
  await tx.cvLine.createMany({
    data: lines.map(
      ({ id: _id, versionId: _from, groupId, hourBagSpec, ...line }) => ({
        ...line,
        versionId: targetVersionId,
        groupId: groupId ? (groupIds.get(groupId) ?? null) : null,
        hourBagSpec: hourBagSpec ?? undefined,
      }),
    ),
  });
  await tx.cvLeasingLine.createMany({
    data: leasingLines.map(({ id: _id, versionId: _from, ...line }) => ({
      ...line,
      versionId: targetVersionId,
    })),
  });
}
