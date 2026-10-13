// src/domain/hours/crossed-thresholds.ts
// Umbrales de consumo (p. ej. 80% y 100%) que un movimiento acaba de cruzar hacia arriba (AGENTS.md §2.4).

// POR QUÉ: lo vendido es APERTURA + AJUSTE y cambia con los ajustes; por eso se compara antes y después.
export type BagConsumption = { soldMinutes: number; balanceMinutes: number };

// REGLA: solo alerta el cruce hacia arriba en este movimiento; un REVERSO o un AJUSTE que baja el consumo
// no alerta, y volver a cruzar después sí.
export function crossedThresholds(
  before: BagConsumption,
  after: BagConsumption,
  thresholdsPct: readonly number[],
): number[] {
  return [...thresholdsPct]
    .sort((a, b) => a - b)
    .filter(
      (pct) =>
        !hasReachedThreshold(before, pct) && hasReachedThreshold(after, pct),
    );
}

// TRAMPA: se compara con enteros (consumido × 100 ≥ pct × vendido) para no depender de la coma flotante.
export function hasReachedThreshold(
  { soldMinutes, balanceMinutes }: BagConsumption,
  pct: number,
): boolean {
  if (soldMinutes <= 0) return false;
  return (soldMinutes - balanceMinutes) * 100 >= pct * soldMinutes;
}
