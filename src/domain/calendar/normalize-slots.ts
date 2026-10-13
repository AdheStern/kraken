// src/domain/calendar/normalize-slots.ts
// Ordena las franjas de un horario y fusiona las solapadas o contiguas del mismo día (AGENTS.md §2.5).
import type { ScheduleSlot } from "./business-calendar";

const MINUTES_PER_DAY = 1440;

export function normalizeSlots(slots: readonly ScheduleSlot[]): ScheduleSlot[] {
  for (const slot of slots) assertValidSlot(slot);
  const sorted = [...slots].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );
  const merged: ScheduleSlot[] = [];
  for (const slot of sorted) {
    const last = merged.at(-1);
    if (last?.weekday === slot.weekday && slot.startMinute <= last.endMinute) {
      merged[merged.length - 1] = {
        ...last,
        endMinute: Math.max(last.endMinute, slot.endMinute),
      };
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

function assertValidSlot({ weekday, startMinute, endMinute }: ScheduleSlot) {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)
    throw new RangeError(`Día de la semana inválido: ${weekday}.`);
  if (
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    startMinute < 0 ||
    endMinute > MINUTES_PER_DAY ||
    startMinute >= endMinute
  )
    throw new RangeError(`Franja inválida: ${startMinute}–${endMinute}.`);
}
