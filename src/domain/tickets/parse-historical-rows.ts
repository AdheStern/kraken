// src/domain/tickets/parse-historical-rows.ts
// Valida y agrupa las filas de la carga histórica de tickets: cada fila es un tramo de trabajo; las filas con la
// misma referencia son un solo ticket, cuya cabecera sale de la primera. La misma función valida en la grilla y
// en el servidor (AGENTS.md §2.6, decisión 2026-11-19).
import { toBusinessDate } from "../calendar/business-date";
import {
  type HistoricalInterval,
  type HistoricalRow,
  IssueLog,
  isBlankHistoricalRow,
  parseWorkInterval,
} from "./historical-row-parts";
import { parseHistoricalDate, toBusinessInstant } from "./historical-values";

export const HISTORICAL_STATUSES = [
  "ASIGNADO",
  "EN_PROGRESO",
  "RESUELTO",
  "CERRADO",
] as const;
export type HistoricalStatus = (typeof HISTORICAL_STATUSES)[number];
const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const;
type Priority = (typeof PRIORITIES)[number];

export type HistoricalTicket = {
  ref: string | null;
  rows: number[];
  title: string;
  description: string;
  customerId: string;
  cityId: string;
  areaIds: string[];
  projectId: string | null;
  priority: Priority;
  ownerId: string;
  status: HistoricalStatus;
  bagId: string | null;
  openedAt: Date;
  resolvedAt: Date | null;
  intervals: HistoricalInterval[];
};

// POR QUÉ: sin hora de apertura o de cierre se usa el inicio y el fin de la jornada de oficina típica.
const OPENING_TIME = "08:30";
const CLOSING_TIME = "18:30";
const HEADER = [
  "openedOn",
  "title",
  "description",
  "customerId",
  "cityId",
  "projectId",
  "priority",
  "ownerId",
  "status",
  "bagId",
  "closedOn",
] as const;

export function parseHistoricalRows(rows: readonly HistoricalRow[], now: Date) {
  const log = new IssueLog();
  const tickets = groupByRef(rows).flatMap((group) => {
    const ticket = toTicket(rows, group, now, log);
    return ticket ? [ticket] : [];
  });
  checkOverlaps(tickets, log);
  return { tickets: log.issues.length > 0 ? [] : tickets, issues: log.issues };
}

function groupByRef(rows: readonly HistoricalRow[]): number[][] {
  const byRef = new Map<string, number[]>();
  const groups: number[][] = [];
  rows.forEach((row, index) => {
    if (isBlankHistoricalRow(row)) return;
    const ref = row.ref.trim().toLowerCase();
    const known = ref ? byRef.get(ref) : undefined;
    if (known) {
      known.push(index);
      return;
    }
    const group = [index];
    if (ref) byRef.set(ref, group);
    groups.push(group);
  });
  return groups;
}

function toTicket(
  rows: readonly HistoricalRow[],
  group: number[],
  now: Date,
  log: IssueLog,
): HistoricalTicket | null {
  const [first, ...rest] = group;
  const head = rows[first];
  const before = log.issues.length;
  for (const index of rest)
    for (const column of HEADER)
      if (rows[index][column].trim() && rows[index][column] !== head[column])
        log.add(
          index,
          column,
          "Esta fila sigue el ticket de su referencia: deja la celda vacía o igual a la primera.",
        );
  const openedOn = parseHistoricalDate(head.openedOn);
  if (!openedOn)
    log.add(first, "openedOn", "Escribe la fecha de apertura como dd/mm/aaaa.");
  const title = head.title.trim();
  if (title.length < 3 || title.length > 160)
    log.add(first, "title", "El título va de 3 a 160 caracteres.");
  for (const column of ["customerId", "cityId", "ownerId"] as const)
    if (!head[column]) log.add(first, column, "Elige un valor.");
  if (head.areaIds.length === 0)
    log.add(first, "areaIds", "Elige al menos un área.");
  const priority = PRIORITIES.find((p) => p === head.priority);
  if (!priority) log.add(first, "priority", "Elige la prioridad.");
  const status = HISTORICAL_STATUSES.find((s) => s === head.status);
  if (!status) log.add(first, "status", "Elige el estado.");
  const intervals = group
    .flatMap((index) => parseWorkInterval(rows[index], index, now, log))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (log.issues.length > before || !openedOn || !priority || !status)
    return null;
  const dates = toTicketDates(
    head,
    first,
    { openedOn, status, intervals },
    now,
    log,
  );
  if (!dates) return null;
  return {
    ref: head.ref.trim() || null,
    rows: group,
    title,
    description: head.description.trim() || title,
    customerId: head.customerId,
    cityId: head.cityId,
    areaIds: head.areaIds,
    projectId: head.projectId || null,
    priority,
    ownerId: head.ownerId,
    status,
    bagId: head.bagId || null,
    ...dates,
    intervals,
  };
}

function toTicketDates(
  head: HistoricalRow,
  row: number,
  {
    openedOn,
    status,
    intervals,
  }: {
    openedOn: string;
    status: HistoricalStatus;
    intervals: HistoricalInterval[];
  },
  now: Date,
  log: IssueLog,
): { openedAt: Date; resolvedAt: Date | null } | null {
  const firstWork = intervals[0];
  const lastEnd = intervals.reduce<Date | null>(
    (max, i) => (!max || i.end > max ? i.end : max),
    null,
  );
  if (firstWork && openedOn > toBusinessDate(firstWork.start))
    return log.fail(
      row,
      "openedOn",
      "La apertura no puede ser posterior al primer trabajo.",
    );
  if (status === "ASIGNADO" && firstWork)
    return log.fail(
      row,
      "status",
      "Con trabajo registrado el ticket queda al menos «En progreso».",
    );
  const openedAt =
    firstWork && openedOn === toBusinessDate(firstWork.start)
      ? firstWork.start
      : earliest(toBusinessInstant(openedOn, OPENING_TIME), now);
  const isDone = status === "RESUELTO" || status === "CERRADO";
  const closedText = head.closedOn.trim();
  if (!isDone)
    return closedText
      ? log.fail(
          row,
          "closedOn",
          "Solo un ticket resuelto o cerrado lleva fecha de cierre.",
        )
      : { openedAt, resolvedAt: null };
  const done = lastEnd ?? openedAt;
  if (!closedText) return { openedAt, resolvedAt: done };
  const closedOn = parseHistoricalDate(closedText);
  if (!closedOn)
    return log.fail(
      row,
      "closedOn",
      "Escribe la fecha de cierre como dd/mm/aaaa.",
    );
  if (closedOn < toBusinessDate(done))
    return log.fail(
      row,
      "closedOn",
      "El cierre no puede ser anterior al último trabajo ni a la apertura.",
    );
  if (closedOn > toBusinessDate(now))
    return log.fail(
      row,
      "closedOn",
      "El cierre no puede ser una fecha futura.",
    );
  const resolvedAt =
    closedOn === toBusinessDate(done)
      ? done
      : earliest(toBusinessInstant(closedOn, CLOSING_TIME), now);
  return { openedAt, resolvedAt };
}

// REGLA: los registros de una misma persona no se solapan (§2.6); la base lo vuelve a exigir con la exclusión.
function checkOverlaps(tickets: HistoricalTicket[], log: IssueLog) {
  const all = tickets
    .flatMap((t) => t.intervals)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const lastEnd = new Map<string, Date>();
  for (const interval of all) {
    const previous = lastEnd.get(interval.executorId);
    if (previous && interval.start < previous)
      log.add(
        interval.row,
        "from",
        "Se solapa con otro tramo de la misma persona en esta carga.",
      );
    if (!previous || interval.end > previous)
      lastEnd.set(interval.executorId, interval.end);
  }
}

const earliest = (a: Date, b: Date) => (a < b ? a : b);
