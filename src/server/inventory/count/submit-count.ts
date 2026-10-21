// src/server/inventory/count/submit-count.ts
// Registra un conteo físico (AGENTS.md §2.8): lo compara con la foto del sistema al empezar y, si hay diferencias,
// pide un ajuste de origen CONTEO por el delta (por cantidad y por seriales). Sin diferencias, no pide nada.
import Decimal from "decimal.js";
import {
  type CountDifference,
  type CountScope,
  computeCountDifferences,
} from "@/domain/inventory/count-differences";
import type { Tx } from "@/server/db";
import type { AdjustmentLine } from "../adjustments/adjustment-lines";
import { requestAdjustment } from "../adjustments/request-adjustment";
import { InventoryStateError } from "../inventory-errors";
import { countSnapshot } from "./count-snapshot";

export type CountedItem = {
  code: string;
  quantity: Decimal;
  serials: string[];
  unitCostUsd: string | null;
};

export type CountInput = {
  warehouseId: string;
  scope: CountScope;
  startedAt: Date;
  items: readonly CountedItem[];
};

export async function submitCount(
  tx: Tx,
  actorId: string,
  input: CountInput,
): Promise<{ requestId: string | null; differences: number }> {
  if (input.startedAt.getTime() > Date.now())
    throw new InventoryStateError("El conteo no puede empezar en el futuro.");
  const byCode = await resolveProducts(tx, input.items);
  const counted = input.items.map((i) => {
    const product = byCode.get(i.code.toUpperCase()) as Product;
    return {
      productId: product.id,
      isSerialized: product.isSerialized,
      quantity: i.quantity,
      serials: i.serials,
    };
  });
  const snapshot = await countSnapshot(tx, input.warehouseId, input.startedAt);
  const differences = computeCountDifferences(input.scope, snapshot, counted);
  if (differences.length === 0) return { requestId: null, differences: 0 };
  const costs = new Map(
    input.items.map((i) => [
      byCode.get(i.code.toUpperCase())?.id,
      i.unitCostUsd,
    ]),
  );
  const { requestId } = await requestAdjustment(tx, actorId, {
    warehouseId: input.warehouseId,
    areaId: null,
    origin: "CONTEO",
    reason: `Conteo ${input.scope === "COMPLETO" ? "completo" : "parcial"} del ${input.startedAt.toISOString().slice(0, 10)}`,
    lines: differences.flatMap((d) =>
      toAdjustmentLines(d, costs.get(d.productId) ?? null),
    ),
  });
  return { requestId, differences: differences.length };
}

type Product = { id: string; code: string; isSerialized: boolean };

async function resolveProducts(
  tx: Tx,
  items: readonly CountedItem[],
): Promise<Map<string, Product>> {
  const products = await tx.product.findMany({
    where: {
      isActive: true,
      code: { in: items.map((i) => i.code), mode: "insensitive" },
    },
    select: { id: true, code: true, isSerialized: true },
  });
  const byCode = new Map(products.map((p) => [p.code.toUpperCase(), p]));
  const missing = items.find((i) => !byCode.has(i.code.toUpperCase()));
  if (missing)
    throw new InventoryStateError(
      `No existe un producto activo con el código ${missing.code}.`,
    );
  return byCode;
}

// REGLA: en un serializado la diferencia son los seriales: los faltantes salen y los sobrantes entran (§2.8).
function toAdjustmentLines(
  d: CountDifference,
  unitCostUsd: string | null,
): AdjustmentLine[] {
  const base = {
    productId: d.productId,
    transferLineId: null,
    systemQuantity: d.systemQuantity.toFixed(2),
  };
  if (d.missingSerials.length === 0 && d.extraSerials.length === 0)
    return [
      {
        ...base,
        delta: d.delta.toFixed(2),
        unitCostUsd: d.delta.isPositive() ? unitCostUsd : null,
        serials: [],
      },
    ];
  const lines: AdjustmentLine[] = [];
  if (d.missingSerials.length > 0)
    lines.push({
      ...base,
      delta: new Decimal(-d.missingSerials.length).toFixed(2),
      unitCostUsd: null,
      serials: d.missingSerials,
    });
  if (d.extraSerials.length > 0)
    lines.push({
      ...base,
      delta: new Decimal(d.extraSerials.length).toFixed(2),
      unitCostUsd,
      serials: d.extraSerials,
    });
  return lines;
}
