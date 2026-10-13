// src/features/sales-control/actions/upsert-cv-lines.ts
// Guarda lotes y líneas de una versión en BORRADOR. Recalcula precio y totales en el servidor con el
// dominio (nunca confía en el navegador) y actualiza los totales de la versión en la misma transacción.
"use server";

import Decimal from "decimal.js";
import { computeVersionTotals } from "@/domain/pricing/compute-version-totals";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction, type Tx } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { type PricedLine, priceLine } from "../line-pricing";
import { loadCvAccess } from "../queries/load-cv-access";
import {
  type CvGroupDraft,
  type CvLineDraft,
  type UpsertCvLinesInput,
  upsertCvLinesSchema,
} from "../schemas/cv-lines-schema";

type ReadyLine = { draft: CvLineDraft; priced: PricedLine | null };

export async function upsertCvLines(
  input: UpsertCvLinesInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = upsertCvLinesSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { versionId, groups, lines } = parsed.data;

  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    select: { cvId: true, status: true, costFxRate: true, saleFxRate: true },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (version.status !== "BORRADOR")
    return actionError(
      "INVALID_STATE",
      "Solo se edita la versión en borrador.",
    );
  const access = await loadCvAccess(version.cvId, versionId);
  if (!access || !canEditCvDraft(user, access))
    return actionError("FORBIDDEN", "No puedes editar este CV.");

  const fx = {
    costFxRate: new Decimal(version.costFxRate.toString()),
    saleFxRate: new Decimal(version.saleFxRate.toString()),
  };
  const groupKeys = new Set(groups.map((group) => group.key));
  const ready: ReadyLine[] = [];
  for (const [index, draft] of lines.entries()) {
    if (draft.groupKey && !groupKeys.has(draft.groupKey))
      return actionError(
        "VALIDATION",
        `Línea ${index + 1}: el lote ya no existe.`,
      );
    if (draft.kind === "NOTA") {
      if (draft.description === "")
        return actionError(
          "VALIDATION",
          `Línea ${index + 1}: la nota está vacía.`,
        );
      ready.push({ draft, priced: null });
      continue;
    }
    const result = priceLine(draft, fx);
    if (!result.ok)
      return actionError(
        "VALIDATION",
        `Línea ${index + 1}: ${result.issues[0].message}`,
      );
    ready.push({ draft, priced: result.value });
  }

  try {
    await runInTransaction((tx) => persist(tx, versionId, groups, ready));
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "upsertCvLines");
  }
}

async function persist(
  tx: Tx,
  versionId: string,
  groups: CvGroupDraft[],
  ready: ReadyLine[],
) {
  const keptLineIds = ready.flatMap(({ draft }) =>
    draft.id ? [draft.id] : [],
  );
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
    const saved = group.id
      ? await tx.cvGroup.update({ where: { id: group.id, versionId }, data })
      : await tx.cvGroup.create({ data: { ...data, versionId } });
    groupIds.set(group.key, saved.id);
  }
  for (const [index, { draft, priced }] of ready.entries()) {
    const data = {
      ...toLineData(draft, priced),
      position: index + 1,
      groupId: draft.groupKey ? (groupIds.get(draft.groupKey) ?? null) : null,
    };
    if (draft.id)
      await tx.cvLine.update({ where: { id: draft.id, versionId }, data });
    else await tx.cvLine.create({ data: { ...data, versionId } });
  }
  const totals = computeVersionTotals(
    ready.flatMap(({ priced }) => (priced ? [priced.totals] : [])),
  );
  await tx.cvVersion.update({
    where: { id: versionId },
    data: {
      totalCostUsd: totals.totalCostUsd.toFixed(2),
      totalSaleUsd: totals.totalSaleUsd.toFixed(2),
    },
  });
}

function toLineData(draft: CvLineDraft, priced: PricedLine | null) {
  if (!priced) {
    return {
      kind: "NOTA" as const,
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
  return {
    kind: "ITEM" as const,
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
