// src/domain/hours/check-version-bag-balances.ts
// Encuentra los ajustes de una versión que dejarían una bolsa con saldo negativo (AGENTS.md §2.4).
// Se evalúa al enviar la versión y otra vez al aprobarla, porque el saldo puede bajar entre ambos momentos.
import type { BagOp, CurrentBag } from "./plan-version-bags";

export type BagShortfall = {
  bagId: string;
  lineId: string;
  balanceMinutes: number;
  deltaMinutes: number;
};

export function findBagShortfalls(
  ops: readonly BagOp[],
  currentBags: readonly CurrentBag[],
): BagShortfall[] {
  const bags = new Map(currentBags.map((b) => [b.bagId, b]));
  return ops.flatMap((op) => {
    if (op.kind !== "ADJUST") return [];
    const bag = bags.get(op.bagId);
    if (bag === undefined)
      throw new Error(`El ajuste apunta a una bolsa desconocida: ${op.bagId}.`);
    // POR QUÉ: un contrato sin tope no tiene saldo que se quede corto (§2.4).
    if (bag.isUncapped) return [];
    const { balanceMinutes } = bag;
    return balanceMinutes + op.deltaMinutes < 0
      ? [
          {
            bagId: op.bagId,
            lineId: op.lineId,
            balanceMinutes,
            deltaMinutes: op.deltaMinutes,
          },
        ]
      : [];
  });
}
