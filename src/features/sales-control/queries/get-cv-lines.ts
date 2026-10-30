// src/features/sales-control/queries/get-cv-lines.ts
// Lotes y líneas de una versión como borrador editable de la grilla (números como texto).
// REGLA: sin permiso de costos no se envían costo ni factor al navegador (AGENTS.md regla 12).
import { prisma } from "@/server/db";
import { parseHourBagSpec } from "../line-details";
import type { CvGroupDraft, CvLineDraft } from "../schemas/cv-lines-schema";

export type CvLinesDraft = { groups: CvGroupDraft[]; lines: CvLineDraft[] };

export async function getCvLines(
  versionId: string,
  canSeeCosts: boolean,
): Promise<CvLinesDraft> {
  const [groups, lines] = await Promise.all([
    prisma.cvGroup.findMany({
      where: { versionId },
      orderBy: { position: "asc" },
    }),
    prisma.cvLine.findMany({
      where: { versionId },
      orderBy: { position: "asc" },
      include: { serials: { orderBy: { serial: "asc" } } },
    }),
  ]);

  return {
    groups: groups.map((g) => ({ key: g.id, id: g.id, name: g.name })),
    lines: lines.map((l) => ({
      key: l.id,
      id: l.id,
      kind: l.kind,
      groupKey: l.groupId,
      areaId: l.areaId,
      supplierId: l.supplierId,
      supplyMode: l.supplyMode,
      technologyId: l.technologyId,
      itemType: l.itemType,
      productId: l.productId,
      code: l.code ?? "",
      description: l.description,
      unitId: l.unitId,
      quantity: l.quantity?.toString() ?? "",
      unitCostUsd: canSeeCosts ? (l.unitCostUsd?.toFixed(2) ?? "") : "",
      pricingSource: l.pricingSource ?? "PRECIO",
      factor: canSeeCosts ? (l.factor?.toFixed(2) ?? "") : "",
      unitSaleUsd: l.unitSaleUsd?.toFixed(2) ?? "",
      poNumber: l.poNumber ?? "",
      notes: l.notes ?? "",
      color: l.color,
      isSubItem: l.isSubItem,
      serials: l.serials.map((s) => s.serial),
      coverageStart: toDateText(l.coverageStart),
      coverageEnd: toDateText(l.coverageEnd),
      activationStart: toDateText(l.activationStart),
      activationEnd: toDateText(l.activationEnd),
      hourBag: parseHourBagSpec(l.hourBagSpec),
      saveAsProduct: false,
    })),
  };
}

function toDateText(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}
