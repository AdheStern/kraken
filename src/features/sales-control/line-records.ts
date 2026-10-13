// src/features/sales-control/line-records.ts
// Convierte el borrador de la grilla en registros listos para guardar: valida cada línea con priceLine,
// fija los montos recalculados y suma los totales de la versión. Puro; lo usa upsertCvLines.

import type { FxRates } from "@/domain/pricing/compute-line-totals";
import { computeVersionTotals } from "@/domain/pricing/compute-version-totals";
import type {
  VersionLineRecord,
  VersionTotalsRecord,
} from "@/server/sales-control/replace-version-lines";
import { type PricedLine, priceLine } from "./line-pricing";
import type { CvGroupDraft, CvLineDraft } from "./schemas/cv-lines-schema";

export type PreparedLines =
  | { ok: true; records: VersionLineRecord[]; totals: VersionTotalsRecord }
  | { ok: false; message: string };

export function prepareLineRecords(
  groups: CvGroupDraft[],
  lines: CvLineDraft[],
  fx: FxRates,
): PreparedLines {
  const groupKeys = new Set(groups.map((group) => group.key));
  const records: VersionLineRecord[] = [];
  const pricedTotals: PricedLine["totals"][] = [];

  for (const [index, draft] of lines.entries()) {
    const prefix = `Línea ${index + 1}:`;
    if (draft.groupKey && !groupKeys.has(draft.groupKey))
      return { ok: false, message: `${prefix} el lote ya no existe.` };
    if (draft.kind === "NOTA") {
      if (draft.description === "")
        return { ok: false, message: `${prefix} la nota está vacía.` };
      records.push({
        id: draft.id,
        groupKey: draft.groupKey,
        data: noteData(draft),
      });
      continue;
    }
    const result = priceLine(draft, fx);
    if (!result.ok)
      return { ok: false, message: `${prefix} ${result.issues[0].message}` };
    records.push({
      id: draft.id,
      groupKey: draft.groupKey,
      data: itemData(draft, result.value),
    });
    pricedTotals.push(result.value.totals);
  }
  const totals = computeVersionTotals(pricedTotals);
  return {
    ok: true,
    records,
    totals: {
      totalCostUsd: totals.totalCostUsd.toFixed(2),
      totalSaleUsd: totals.totalSaleUsd.toFixed(2),
    },
  };
}

function itemData(
  draft: CvLineDraft,
  priced: PricedLine,
): VersionLineRecord["data"] {
  return {
    kind: "ITEM",
    description: draft.description,
    areaId: draft.areaId,
    supplierId: draft.supplierId,
    supplyMode: draft.supplyMode,
    technologyId: draft.technologyId,
    itemType: draft.itemType,
    productId: draft.productId,
    code: draft.code || null,
    unitId: draft.unitId,
    quantity: priced.quantity.toFixed(2),
    unitCostUsd: priced.unitCostUsd.toFixed(2),
    factor: priced.pricing.factor?.toFixed(2) ?? null,
    unitSaleUsd: priced.pricing.unitSaleUsd.toFixed(2),
    pricingSource: priced.pricing.pricingSource,
    poNumber: draft.poNumber || null,
    notes: draft.notes || null,
  };
}

function noteData(draft: CvLineDraft): VersionLineRecord["data"] {
  return {
    kind: "NOTA",
    description: draft.description,
    areaId: null,
    supplierId: null,
    supplyMode: null,
    technologyId: null,
    itemType: null,
    productId: null,
    code: null,
    unitId: null,
    quantity: null,
    unitCostUsd: null,
    factor: null,
    unitSaleUsd: null,
    pricingSource: null,
    poNumber: null,
    notes: null,
  };
}
