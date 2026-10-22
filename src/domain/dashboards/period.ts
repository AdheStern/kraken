// src/domain/dashboards/period.ts
// Periodos de los tableros (mes, trimestre, año) con sus límites UTC calculados en La Paz y el periodo anterior
// para comparar (AGENTS.md §6, regla 5).
import { fromZonedTime } from "date-fns-tz";
import { BUSINESS_TIME_ZONE, toBusinessDate } from "../calendar/business-date";
import type { Clock } from "../clock";

export type PeriodKind = "MES" | "TRIMESTRE" | "ANIO";

// POR QUÉ: index es el mes (1–12) o el trimestre (1–4); en un año vale 1.
export type PeriodRef = { kind: PeriodKind; year: number; index: number };

export type Period = PeriodRef & {
  label: string;
  start: Date;
  end: Date;
  months: string[];
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = (year: number, month: number) =>
  `${year}-${pad(month)}`;

export function currentPeriodRef(kind: PeriodKind, clock: Clock): PeriodRef {
  const [year, month] = toBusinessDate(clock.now()).split("-").map(Number);
  if (kind === "MES") return { kind, year, index: month };
  if (kind === "TRIMESTRE") return { kind, year, index: Math.ceil(month / 3) };
  return { kind, year, index: 1 };
}

export function previousPeriodRef(ref: PeriodRef): PeriodRef {
  if (ref.kind === "ANIO") return { ...ref, year: ref.year - 1 };
  const last = ref.kind === "MES" ? 12 : 4;
  return ref.index > 1
    ? { ...ref, index: ref.index - 1 }
    : { ...ref, year: ref.year - 1, index: last };
}

// REGLA: el inicio es la medianoche de La Paz del primer día; el fin es exclusivo (inicio del periodo siguiente).
export function resolvePeriod(ref: PeriodRef): Period {
  const [firstMonth, count] = monthSpan(ref);
  const months = Array.from({ length: count }, (_, i) =>
    monthKey(ref.year, firstMonth + i),
  );
  const endYear = firstMonth + count > 12 ? ref.year + 1 : ref.year;
  const endMonth = ((firstMonth + count - 1) % 12) + 1;
  return {
    ...ref,
    label: labelOf(ref),
    start: startOfMonth(ref.year, firstMonth),
    end: startOfMonth(endYear, endMonth),
    months,
  };
}

function monthSpan(ref: PeriodRef): [number, number] {
  if (ref.kind === "MES") return [ref.index, 1];
  if (ref.kind === "TRIMESTRE") return [(ref.index - 1) * 3 + 1, 3];
  return [1, 12];
}

function labelOf(ref: PeriodRef): string {
  if (ref.kind === "MES") return `${MONTHS[ref.index - 1]} ${ref.year}`;
  if (ref.kind === "TRIMESTRE") return `T${ref.index} ${ref.year}`;
  return String(ref.year);
}

function startOfMonth(year: number, month: number): Date {
  return fromZonedTime(
    `${monthKey(year, month)}-01T00:00:00`,
    BUSINESS_TIME_ZONE,
  );
}
