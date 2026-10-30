// src/features/sales-control/line-records.ts
// Convierte el borrador de la grilla en registros listos para guardar: valida cada línea con priceLine
// y las reglas de detalle, fija los montos recalculados y suma los totales. Puro; lo usa upsertCvLines.
import type { FxRates } from "@/domain/pricing/compute-line-totals";
import { computeVersionTotals } from "@/domain/pricing/compute-version-totals";
import { numberItems } from "@/domain/sales-control/number-items";
import type {
  VersionLineRecord,
  VersionTotalsRecord,
} from "@/server/sales-control/replace-version-lines";
import {
  bagKindOf,
  type LineDetailContext,
  lineDetailIssues,
} from "./line-details";
import { type PricedLine, priceLine } from "./line-pricing";
import type { CvGroupDraft, CvLineDraft } from "./schemas/cv-lines-schema";

export type PreparedLines =
  | { ok: true; records: VersionLineRecord[]; totals: VersionTotalsRecord }
  | { ok: false; message: string };

export function prepareLineRecords(
  groups: CvGroupDraft[],
  lines: CvLineDraft[],
  fx: FxRates,
  context: LineDetailContext,
): PreparedLines {
  const groupKeys = new Set(groups.map((group) => group.key));
  const records: VersionLineRecord[] = [];
  const pricedTotals: PricedLine["totals"][] = [];
  const { orphans } = numberItems(
    lines.map((l) => ({ ...l, sectionKey: l.groupKey })),
  );
  if (orphans.length > 0)
    return {
      ok: false,
      message: `Línea ${orphans[0] + 1}: un subítem necesita una línea principal antes, en el mismo lote.`,
    };

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
        serials: [],
        createProduct: false,
        data: noteData(draft),
      });
      continue;
    }
    const result = priceLine(draft, fx);
    const issues = [
      ...(result.ok ? [] : result.issues),
      ...lineDetailIssues(draft, context),
    ];
    if (!result.ok || issues.length > 0)
      return { ok: false, message: `${prefix} ${issues[0].message}` };
    records.push({
      id: draft.id,
      groupKey: draft.groupKey,
      serials: draft.serials,
      createProduct: draft.saveAsProduct && !draft.productId,
      data: itemData(draft, result.value, bagKindOf(draft, context)),
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
  bagKind: "HORAS" | "VIGENCIA" | null,
): VersionLineRecord["data"] {
  // POR QUÉ: una bolsa de horas no lleva tope y un contrato vence con su vigencia, no con expiresOn.
  const hourBag =
    bagKind && draft.hourBag
      ? {
          ...draft.hourBag,
          kind: bagKind,
          capHours:
            bagKind === "VIGENCIA" ? draft.hourBag.capHours || null : null,
          expiresOn:
            bagKind === "HORAS" ? draft.hourBag.expiresOn || null : null,
        }
      : null;
  return {
    kind: "ITEM",
    isSubItem: draft.isSubItem,
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
    color: draft.color,
    coverageStart: draft.coverageStart ? new Date(draft.coverageStart) : null,
    coverageEnd: draft.coverageEnd ? new Date(draft.coverageEnd) : null,
    hourBagSpec: hourBag,
  };
}

function noteData(draft: CvLineDraft): VersionLineRecord["data"] {
  return {
    kind: "NOTA",
    isSubItem: false,
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
    color: draft.color,
    coverageStart: null,
    coverageEnd: null,
    hourBagSpec: null,
  };
}
