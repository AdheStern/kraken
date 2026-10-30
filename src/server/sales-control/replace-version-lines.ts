// src/server/sales-control/replace-version-lines.ts
// Sincroniza lotes y líneas de una versión en BORRADOR con lo que mandó el editor y guarda sus totales.
// Corre dentro de la transacción de la action; los triggers de cv rechazan versiones cerradas (ADR-11).
import { Prisma } from "@/generated/prisma/client";
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
  serials: string[];
  // POR QUÉ: un producto escrito a mano se da de alta en el catálogo marcado "creado desde CV" (§2.1).
  createProduct: boolean;
  data: {
    kind: CvLineKind;
    isSubItem: boolean;
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
    color: string | null;
    coverageStart: Date | null;
    coverageEnd: Date | null;
    activationStart: Date | null;
    activationEnd: Date | null;
    hourBagSpec: Prisma.InputJsonValue | null;
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
    await saveLine(tx, versionId, line, index + 1, groupId);
  }
  await tx.cvVersion.update({ where: { id: versionId }, data: totals });
}

async function saveLine(
  tx: Tx,
  versionId: string,
  line: VersionLineRecord,
  position: number,
  groupId: string | null,
) {
  const productId = line.createProduct
    ? await createProductFromLine(tx, line)
    : line.data.productId;
  const data = {
    ...line.data,
    productId,
    position,
    groupId,
    hourBagSpec: line.data.hourBagSpec ?? Prisma.DbNull,
  };
  const saved = line.id
    ? await tx.cvLine.update({ where: { id: line.id, versionId }, data })
    : await tx.cvLine.create({ data: { ...data, versionId } });
  if (line.id)
    await tx.cvLineSerial.deleteMany({ where: { lineId: saved.id } });
  if (line.serials.length > 0) {
    await tx.cvLineSerial.createMany({
      data: line.serials.map((serial) => ({ lineId: saved.id, serial })),
    });
  }
}

async function createProductFromLine(
  tx: Tx,
  line: VersionLineRecord,
): Promise<string> {
  const { code, description, technologyId, unitId, itemType } = line.data;
  if (!code || !itemType)
    throw new Error("Producto desde CV sin código o tipo");
  const product = await tx.product.create({
    data: {
      code,
      description,
      technologyId,
      unitId,
      itemType,
      createdFromCv: true,
    },
  });
  return product.id;
}
