// src/domain/hours/summarize-bag.ts
// Cifras de una bolsa a partir de su libro: vendido, consumido, vencido y % consumido (AGENTS.md §2.4, §6).
// REGLA: es la única definición de estas cifras; vistas, alertas y tableros la reutilizan (§6).

export type MovementKind =
  | "APERTURA"
  | "CONSUMO"
  | "REVERSO"
  | "AJUSTE"
  | "VENCIMIENTO";

export type MovementTotals = Partial<Record<MovementKind, number>>;

export type BagFigures = {
  soldMinutes: number;
  consumedMinutes: number;
  expiredMinutes: number;
  balanceMinutes: number;
  consumedPct: number;
};

// POR QUÉ: vendido = APERTURA + AJUSTE (incluye ajustes manuales y de versión); consumido = CONSUMO neto de
// REVERSO. El % usa vendido − saldo, igual que las alertas, y se trunca: 79.6% nunca se muestra como 80%.
// TRAMPA: 0 − x y no −x, que con x = 0 daría −0.
export function summarizeBag(
  totals: MovementTotals,
  balanceMinutes: number,
): BagFigures {
  const soldMinutes = (totals.APERTURA ?? 0) + (totals.AJUSTE ?? 0);
  const used = soldMinutes - balanceMinutes;
  return {
    soldMinutes,
    consumedMinutes: 0 - ((totals.CONSUMO ?? 0) + (totals.REVERSO ?? 0)),
    expiredMinutes: 0 - (totals.VENCIMIENTO ?? 0),
    balanceMinutes,
    consumedPct:
      soldMinutes > 0
        ? Math.min(100, Math.max(0, Math.floor((used * 100) / soldMinutes)))
        : 0,
  };
}
