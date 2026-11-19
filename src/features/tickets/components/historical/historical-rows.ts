// src/features/tickets/components/historical/historical-rows.ts
// Operaciones sobre las filas de la carga histórica: fila en blanco, pegar un bloque desde Excel desde la celda
// enfocada (reconociendo catálogos por nombre o código) y «Aplicar a todas» o solo a las vacías.
import type { HistoricalRow } from "@/domain/tickets/historical-row-parts";
import { matchCatalog } from "@/lib/match-catalog";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import {
  cellValue,
  HISTORICAL_COLUMNS,
  HISTORICAL_KEYS,
  type HistoricalKey,
  optionsFor,
  withCell,
} from "./historical-columns";

export type DraftRow = HistoricalRow & { key: string };

export function blankHistoricalRow(
  defaults: Partial<HistoricalRow> = {},
): DraftRow {
  return {
    key: crypto.randomUUID(),
    ref: "",
    openedOn: "",
    title: "",
    description: "",
    customerId: "",
    cityId: "",
    areaIds: [],
    projectId: "",
    priority: "",
    ownerId: "",
    status: "",
    workDate: "",
    from: "",
    to: "",
    executorId: "",
    bagId: "",
    closedOn: "",
    ...defaults,
  };
}

// REGLA de la planilla: el bloque pisa las filas siguientes y crea las que falten; un valor de catálogo que no se
// reconoce queda vacío para que la validación lo marque.
export function pasteIntoRows(
  rows: DraftRow[],
  matrix: string[][],
  target: { row: number; col: number },
  options: TicketFormOptions,
  defaults: Partial<HistoricalRow>,
): DraftRow[] {
  const next = [...rows];
  matrix.forEach((cells, offset) => {
    const index = target.row + offset;
    let row = next[index] ?? blankHistoricalRow(defaults);
    cells.forEach((text, c) => {
      const key = HISTORICAL_KEYS[target.col + c];
      if (key) row = withCell(row, key, toCellValue(key, text, options));
    });
    next[index] = row;
  });
  return next;
}

export function fillHistoricalColumn(
  rows: DraftRow[],
  key: HistoricalKey,
  value: string,
  onlyEmpty: boolean,
): DraftRow[] {
  return rows.map((row) =>
    onlyEmpty && cellValue(row, key) ? row : withCell(row, key, value),
  );
}

function toCellValue(
  key: HistoricalKey,
  text: string,
  options: TicketFormOptions,
): string {
  if (HISTORICAL_COLUMNS[key].kind !== "select") return text.trim();
  if (!text.trim()) return "";
  return matchCatalog(optionsFor(key, options), text) ?? "";
}
