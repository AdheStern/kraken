// src/domain/inventory/count-differences.ts
// Diferencias entre un conteo físico y la foto del sistema tomada al iniciarlo (AGENTS.md §2.8): por cantidad y,
// en los serializados, por lista de seriales. El ajuste aplica el delta, no la cantidad contada.
import Decimal from "decimal.js";

// REGLA: en un conteo COMPLETO lo no contado vale 0 (faltante); en uno PARCIAL solo se comparan los productos
// contados (conteos cíclicos).
export type CountScope = "COMPLETO" | "PARCIAL";

export type CountItem = {
  productId: string;
  isSerialized: boolean;
  quantity: Decimal;
  serials: readonly string[];
};

export type CountDifference = {
  productId: string;
  systemQuantity: Decimal;
  countedQuantity: Decimal;
  delta: Decimal;
  missingSerials: string[];
  extraSerials: string[];
};

export function computeCountDifferences(
  scope: CountScope,
  snapshot: readonly CountItem[],
  counted: readonly CountItem[],
): CountDifference[] {
  const system = mergeByProduct(snapshot);
  const found = mergeByProduct(counted);
  const productIds =
    scope === "COMPLETO"
      ? [...system.keys(), ...found.keys()]
      : [...found.keys()];
  return [...new Set(productIds)]
    .sort()
    .map((productId) =>
      compare(productId, system.get(productId), found.get(productId)),
    )
    .filter(
      (d) =>
        !d.delta.isZero() ||
        d.missingSerials.length > 0 ||
        d.extraSerials.length > 0,
    );
}

function compare(
  productId: string,
  system: CountItem | undefined,
  counted: CountItem | undefined,
): CountDifference {
  const systemSerials = new Set(system?.serials ?? []);
  const countedSerials = new Set(counted?.serials ?? []);
  const systemQuantity = system?.quantity ?? new Decimal(0);
  const countedQuantity = counted?.quantity ?? new Decimal(0);
  return {
    productId,
    systemQuantity,
    countedQuantity,
    delta: countedQuantity.minus(systemQuantity),
    missingSerials: [...systemSerials]
      .filter((s) => !countedSerials.has(s))
      .sort(),
    extraSerials: [...countedSerials]
      .filter((s) => !systemSerials.has(s))
      .sort(),
  };
}

// POR QUÉ: el mismo producto se escanea varias veces; las cantidades se suman y un serial leído dos veces cuenta
// una. En un serializado la cantidad es la de seriales distintos, no la tipeada.
function mergeByProduct(items: readonly CountItem[]): Map<string, CountItem> {
  const merged = new Map<string, CountItem>();
  for (const item of items) {
    const previous = merged.get(item.productId);
    const serials = [
      ...new Set([
        ...(previous?.serials ?? []),
        ...item.serials.map((s) => s.trim()).filter(Boolean),
      ]),
    ];
    const quantity = item.isSerialized
      ? new Decimal(serials.length)
      : (previous?.quantity ?? new Decimal(0)).plus(item.quantity);
    merged.set(item.productId, { ...item, quantity, serials });
  }
  return merged;
}
