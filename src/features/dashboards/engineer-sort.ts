// src/features/dashboards/engineer-sort.ts
// Orden del listado de ingenieros por columna desde la URL (?orden=&dir=), con un valor por defecto y sin aceptar
// columnas desconocidas (AGENTS.md §6).
import type { EngineerRow } from "./types";

export const ENGINEER_SORT_KEYS = [
  "name",
  "loggedMinutes",
  "utilizationPct",
  "outsidePct",
  "ownedResolved",
  "participated",
  "chargedMinutes",
  "slaPct",
  "medianResolutionMinutes",
  "latePct",
  "satisfiedPct",
] as const satisfies readonly (keyof EngineerRow)[];

export type EngineerSortKey = (typeof ENGINEER_SORT_KEYS)[number];
export type EngineerSort = { key: EngineerSortKey; dir: "asc" | "desc" };

const DEFAULT: EngineerSort = { key: "loggedMinutes", dir: "desc" };

export function toEngineerSort(orden: unknown, dir: unknown): EngineerSort {
  const key = ENGINEER_SORT_KEYS.find((k) => k === orden);
  if (!key) return DEFAULT;
  return { key, dir: dir === "asc" ? "asc" : "desc" };
}

// POR QUÉ: lo que no tiene base (null) va siempre al final, en cualquier dirección.
export function sortEngineerRows(
  rows: readonly EngineerRow[],
  { key, dir }: EngineerSort,
): EngineerRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    if (typeof x === "string" && typeof y === "string")
      return sign * x.localeCompare(y, "es");
    return sign * (Number(x) - Number(y));
  });
}
