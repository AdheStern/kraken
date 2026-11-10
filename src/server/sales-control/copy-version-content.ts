// src/server/sales-control/copy-version-content.ts
// Copia lotes, líneas y leasing de una versión a otra en BORRADOR (duplicar CV, nueva versión); al renovar, solo
// las líneas elegidas con su vigencia siguiente y sin leasing (§2.1 "Vigencia").
// POR QUÉ: una versión nueva del mismo CV (sameSale) conserva los seriales y el linaje de cada línea, que
// enlaza su bolsa de horas (§2.4); un CV duplicado no, porque es otra venta con otras entregas y bolsas.
import { shiftCoverage } from "@/domain/sales-control/shift-coverage";
import type { CvLine } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";

export async function copyVersionContent(
  tx: Tx,
  sourceVersionId: string,
  targetVersionId: string,
  {
    sameSale,
    renewLineIds,
  }: { sameSale: boolean; renewLineIds?: readonly string[] },
): Promise<void> {
  // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
  const groups = await tx.cvGroup.findMany({
    where: { versionId: sourceVersionId },
    orderBy: { position: "asc" },
  });
  const lines = await tx.cvLine.findMany({
    where: {
      versionId: sourceVersionId,
      ...(renewLineIds ? { id: { in: [...renewLineIds] } } : {}),
    },
    orderBy: { position: "asc" },
    include: { serials: true },
  });
  const leasingLines = renewLineIds
    ? []
    : await tx.cvLeasingLine.findMany({
        where: { versionId: sourceVersionId },
        orderBy: { position: "asc" },
      });

  const groupIds = new Map<string, string>();
  const used = new Set(lines.map((l) => l.groupId));
  for (const group of groups.filter((g) => !renewLineIds || used.has(g.id))) {
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
  for (const [index, source] of lines.entries()) {
    const {
      id,
      versionId: _from,
      groupId,
      hourBagSpec,
      originLineId,
      serials,
      ...line
    } = renewLineIds ? toRenewal(source, index) : source;
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

// REGLA: la renovación es otro periodo: vigencia siguiente, sin activación, PO ni BC del periodo anterior y sin
// colgar de una línea que quizá no se renueva.
function toRenewal<T extends CvLine>(line: T, index: number): T {
  const coverage =
    line.coverageStart && line.coverageEnd
      ? shiftCoverage({
          start: line.coverageStart.toISOString().slice(0, 10),
          end: line.coverageEnd.toISOString().slice(0, 10),
        })
      : null;
  return {
    ...line,
    position: index + 1,
    isSubItem: false,
    poNumber: null,
    bc: null,
    activationStart: null,
    activationEnd: null,
    coverageStart: coverage ? new Date(coverage.start) : line.coverageStart,
    coverageEnd: coverage ? new Date(coverage.end) : line.coverageEnd,
  };
}
