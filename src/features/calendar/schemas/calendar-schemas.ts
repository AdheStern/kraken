// src/features/calendar/schemas/calendar-schemas.ts
// Entradas de los catálogos de horario de oficina y feriados; el mismo zod valida formulario y action (§2.5).
import { z } from "zod";
import { toMinuteOfDay } from "../time-text";

const WEEKDAY_NAMES = [
  "",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

const slotSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    start: z.string(),
    end: z.string(),
  })
  .transform((slot, ctx) => {
    const startMinute = toMinuteOfDay(slot.start, false);
    const endMinute = toMinuteOfDay(slot.end, true);
    if (
      startMinute === null ||
      endMinute === null ||
      startMinute >= endMinute
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Revisa la franja del ${WEEKDAY_NAMES[slot.weekday]}: debe terminar después de empezar.`,
      });
      return z.NEVER;
    }
    return { weekday: slot.weekday, startMinute, endMinute };
  });

export const officeScheduleSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(3, "Ponle un nombre al horario.").max(80),
  slots: z
    .array(slotSchema)
    .max(28)
    .superRefine((slots, ctx) => {
      const day = findOverlappingWeekday(slots);
      if (day)
        ctx.addIssue({
          code: "custom",
          message: `Las franjas del ${WEEKDAY_NAMES[day]} se solapan.`,
        });
    }),
});

export const assignCityScheduleSchema = z.object({
  cityId: z.uuid(),
  scheduleId: z.uuid().nullable(),
});

export const holidaySchema = z.object({
  date: z.iso.date("Elige la fecha del feriado."),
  name: z.string().trim().min(3, "Escribe el nombre del feriado.").max(80),
  cityId: z.uuid().nullable(),
});

export const updateHolidaySchema = holidaySchema.extend({ id: z.uuid() });

export const deactivateHolidaySchema = z.object({ id: z.uuid() });

export const deactivateOfficeScheduleSchema = z.object({ id: z.uuid() });

export type OfficeScheduleInput = z.input<typeof officeScheduleSchema>;
export type AssignCityScheduleInput = z.infer<typeof assignCityScheduleSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type DeactivateHolidayInput = z.infer<typeof deactivateHolidaySchema>;
export type DeactivateOfficeScheduleInput = z.infer<
  typeof deactivateOfficeScheduleSchema
>;

// REGLA: franjas contiguas (12:30 y 12:30) son válidas; solo se rechaza que una empiece antes de que termine
// la anterior del mismo día (§2.5).
function findOverlappingWeekday(
  slots: { weekday: number; startMinute: number; endMinute: number }[],
): number | null {
  const sorted = [...slots].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );
  for (const [index, slot] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (
      previous?.weekday === slot.weekday &&
      slot.startMinute < previous.endMinute
    )
      return slot.weekday;
  }
  return null;
}
