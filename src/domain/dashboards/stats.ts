// src/domain/dashboards/stats.ts
// Estadísticos de presentación de los tableros: mediana y porcentaje con un decimal (AGENTS.md §6).

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// POR QUÉ: los % operativos son de presentación (no montos); sin base no hay porcentaje que mostrar.
export function sharePct(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part * 1000) / whole) / 10;
}
