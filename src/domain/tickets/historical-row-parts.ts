// src/domain/tickets/historical-row-parts.ts
// Piezas de la carga histórica de tickets: la fila tal como llega de la grilla, el registro de errores por celda y
// el tramo de trabajo de una fila (AGENTS.md §2.6, decisión 2026-11-19).
import {
  parseHistoricalDate,
  parseHistoricalTime,
  toBusinessInstant,
} from "./historical-values";
import { MAX_MANUAL_ENTRY_MS } from "./time-entry-rules";

// POR QUÉ: los catálogos ya vienen como id (o vacío) desde los selectores de la grilla; fechas y horas, como texto.
export type HistoricalRow = {
  ref: string;
  openedOn: string;
  title: string;
  description: string;
  customerId: string;
  cityId: string;
  areaIds: string[];
  projectId: string;
  priority: string;
  ownerId: string;
  status: string;
  workDate: string;
  from: string;
  to: string;
  executorId: string;
  bagId: string;
  closedOn: string;
};
export type HistoricalColumn = keyof HistoricalRow;
export type HistoricalIssue = {
  row: number;
  column: HistoricalColumn;
  message: string;
};
export type HistoricalInterval = {
  row: number;
  executorId: string;
  start: Date;
  end: Date;
};

export class IssueLog {
  readonly issues: HistoricalIssue[] = [];

  add(row: number, column: HistoricalColumn, message: string): void {
    this.issues.push({ row, column, message });
  }

  // POR QUÉ: registra el error y devuelve null para cortar la validación de esa fila en una sola línea.
  fail(row: number, column: HistoricalColumn, message: string): null {
    this.add(row, column, message);
    return null;
  }
}

export function isBlankHistoricalRow(row: HistoricalRow): boolean {
  return Object.values(row).every((v) =>
    Array.isArray(v) ? v.length === 0 : !v.trim(),
  );
}

// Una fila sin fecha ni horas no tiene trabajo (por ejemplo, un ticket asignado que nadie empezó). Sin ejecutor,
// el tramo queda vacío y el ticket le pone su encargado.
export function parseWorkInterval(
  row: HistoricalRow,
  index: number,
  now: Date,
  log: IssueLog,
): HistoricalInterval[] {
  if (!row.workDate.trim() && !row.from.trim() && !row.to.trim()) return [];
  const date = parseHistoricalDate(row.workDate);
  const from = parseHistoricalTime(row.from);
  const to = parseHistoricalTime(row.to);
  if (!date)
    log.add(index, "workDate", "Escribe la fecha del trabajo como dd/mm/aaaa.");
  if (!from) log.add(index, "from", "Escribe la hora de inicio como hh:mm.");
  if (!to) log.add(index, "to", "Escribe la hora de fin como hh:mm.");
  if (!date || !from || !to) return [];
  const start = toBusinessInstant(date, from);
  const end = toBusinessInstant(date, to);
  if (end <= start)
    return fail(
      log,
      index,
      "El fin debe ser posterior al inicio; si pasa la medianoche, pártelo en dos filas.",
    );
  if (end > now)
    return fail(log, index, "El trabajo no puede terminar en el futuro.");
  if (end.getTime() - start.getTime() > MAX_MANUAL_ENTRY_MS)
    return fail(
      log,
      index,
      "Un tramo dura hasta 16 h; pártelo en varias filas.",
    );
  return [{ row: index, executorId: row.executorId, start, end }];
}

function fail(log: IssueLog, row: number, message: string): [] {
  log.add(row, "to", message);
  return [];
}
