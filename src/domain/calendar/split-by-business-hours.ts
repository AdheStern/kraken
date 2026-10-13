// src/domain/calendar/split-by-business-hours.ts
// Parte un intervalo en tramos dentro y fuera del horario de oficina, con los feriados enteros fuera.
// Regla normativa: AGENTS.md §2.5 y la partición del caso HORAS-01 (§15.2).
import { fromZonedTime } from "date-fns-tz";
import type { BusinessCalendar, ScheduleSlot } from "./business-calendar";
import { BUSINESS_TIME_ZONE, toBusinessDate } from "./business-date";
import { normalizeSlots } from "./normalize-slots";

export type TimeInterval = { start: Date; end: Date };

export type BusinessSegment = TimeInterval & { isInside: boolean };

// LIMITACIÓN: conserva los instantes exactos; pasar a minutos enteros y redondear es de la asignación (§2.6).
// Los tramos contiguos del mismo tipo se fusionan, también a través de la medianoche.
export function splitByBusinessHours(
  { start, end }: TimeInterval,
  calendar: BusinessCalendar,
): BusinessSegment[] {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    throw new RangeError("El intervalo tiene una fecha inválida.");
  if (end < start)
    throw new RangeError("El intervalo termina antes de empezar.");

  const slotsByWeekday = groupByWeekday(normalizeSlots(calendar.slots));
  const segments: BusinessSegment[] = [];
  let date = toBusinessDate(start);
  let dayStart = atLocalMinute(date, 0);
  while (dayStart < end) {
    const nextDate = addOneDay(date);
    const nextDayStart = atLocalMinute(nextDate, 0);
    const slots = calendar.holidays.has(date)
      ? []
      : (slotsByWeekday.get(isoWeekday(date)) ?? []);
    const windows = slots.map((slot) => ({
      start: atLocalMinute(date, slot.startMinute),
      end:
        slot.endMinute === 1440
          ? nextDayStart
          : atLocalMinute(date, slot.endMinute),
    }));
    splitDay(
      segments,
      maxDate(start, dayStart),
      minDate(end, nextDayStart),
      windows,
    );
    date = nextDate;
    dayStart = nextDayStart;
  }
  return segments;
}

function splitDay(
  segments: BusinessSegment[],
  from: Date,
  to: Date,
  windows: readonly TimeInterval[],
) {
  let cursor = from;
  for (const window of windows) {
    const insideStart = maxDate(window.start, cursor);
    const insideEnd = minDate(window.end, to);
    if (insideEnd <= insideStart) continue;
    pushSegment(segments, { start: cursor, end: insideStart, isInside: false });
    pushSegment(segments, {
      start: insideStart,
      end: insideEnd,
      isInside: true,
    });
    cursor = insideEnd;
  }
  pushSegment(segments, { start: cursor, end: to, isInside: false });
}

function pushSegment(segments: BusinessSegment[], segment: BusinessSegment) {
  if (segment.end <= segment.start) return;
  const last = segments.at(-1);
  if (
    last?.isInside === segment.isInside &&
    last.end.getTime() === segment.start.getTime()
  ) {
    segments[segments.length - 1] = { ...last, end: segment.end };
    return;
  }
  segments.push(segment);
}

function groupByWeekday(slots: readonly ScheduleSlot[]) {
  const byWeekday = new Map<number, ScheduleSlot[]>();
  for (const slot of slots)
    byWeekday.set(slot.weekday, [...(byWeekday.get(slot.weekday) ?? []), slot]);
  return byWeekday;
}

function atLocalMinute(date: string, minute: number): Date {
  const hh = String(Math.floor(minute / 60)).padStart(2, "0");
  const mm = String(minute % 60).padStart(2, "0");
  return fromZonedTime(`${date}T${hh}:${mm}:00`, BUSINESS_TIME_ZONE);
}

// POR QUÉ: la aritmética de fechas civiles va en UTC para no depender de la zona del proceso.
function addOneDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}
