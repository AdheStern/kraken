// src/server/sales-control/replace-version-lines.ts
// Sincroniza lotes y líneas de una versión en BORRADOR con lo que mandó el editor y guarda sus totales.
// Corre dentro de la transacción de la action; los triggers de cv rechazan versiones cerradas (ADR-11).
import type {
  CvLineKind,
  ItemType,
  PricingSource,
  SupplyMode,
} from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";

export type VersionGroupRecord = {
  key: string;
  id: string | null;
  name: string;
};

export type VersionLineRecord = {
  id: string | null;
  groupKey: string | null;
  data: {
    kind: CvLineKind;
    description: string;
    areaId: string | null;
    supplierId: string | null;
    supplyMode: SupplyMode | null;
    technologyId: string | null;
    itemType: ItemType | null;
    productId: string | null;
    code: string | null;
    unitId: string | null;
    quantity: string | null;
    unitCostUsd: string | null;
    factor: string | null;
    unitSaleUsd: string | null;
    pricingSource: PricingSource | null;
    poNumber: string | null;
    notes: string | null;
  };
};

export type VersionTotalsRecord = {
  totalCostUsd: string;
  totalSaleUsd: string;
};

export async function replaceVersionLines(
  tx: Tx,
  versionId: string,
  groups: VersionGroupRecord[],
  lines: VersionLineRecord[],
  totals: VersionTotalsRecord,
): Promise<void> {
  const keptLineIds = lines.flatMap((line) => (line.id ? [line.id] : []));
  const keptGroupIds = groups.flatMap((group) => (group.id ? [group.id] : []));
  await tx.cvLine.deleteMany({
    where: { versionId, id: { notIn: keptLineIds } },
  });
  await tx.cvGroup.deleteMany({
    where: { versionId, id: { notIn: keptGroupIds } },
  });

  const groupIds = new Map<string, string>();
  for (const [index, group] of groups.entries()) {
    const data = { name: group.name, position: index + 1 };
    // TRAMPA: el filtro por versionId impide tocar lotes o líneas de otra versión con un id ajeno.
    const saved = group.id
      ? await tx.cvGroup.update({ where: { id: group.id, versionId }, data })
      : await tx.cvGroup.create({ data: { ...data, versionId } });
    groupIds.set(group.key, saved.id);
  }
  for (const [index, line] of lines.entries()) {
    const groupId = line.groupKey
      ? (groupIds.get(line.groupKey) ?? null)
      : null;
    const data = { ...line.data, position: index + 1, groupId };
    if (line.id)
      await tx.cvLine.update({ where: { id: line.id, versionId }, data });
    else await tx.cvLine.create({ data: { ...data, versionId } });
  }
  await tx.cvVersion.update({ where: { id: versionId }, data: totals });
}
