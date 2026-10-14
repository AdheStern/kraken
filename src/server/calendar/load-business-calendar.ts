// src/server/calendar/load-business-calendar.ts
// Arma el calendario de negocio de una ciudad para un rango: franjas de su horario más feriados nacionales y
// de esa ciudad (AGENTS.md §2.5). Lo usa la asignación de horas de los tickets (F3).
import type { BusinessCalendar } from "@/domain/calendar/business-calendar";
import type { Tx } from "@/server/db";

type Range = { from: string; to: string };

// TRAMPA: se pasa la ciudad del ticket, no la del ingeniero (§2.5).
// LIMITACIÓN: una ciudad sin horario asignado no tiene franjas; todo su tiempo cuenta fuera de horario.
export async function loadBusinessCalendar(
  db: Pick<Tx, "city" | "holiday">,
  cityId: string,
  { from, to }: Range,
): Promise<BusinessCalendar> {
  const city = await db.city.findUniqueOrThrow({
    where: { id: cityId },
    select: {
      officeSchedule: {
        select: {
          isActive: true,
          slots: {
            select: { weekday: true, startMinute: true, endMinute: true },
          },
        },
      },
    },
  });
  const holidays = await db.holiday.findMany({
    where: {
      isActive: true,
      date: {
        gte: new Date(`${from}T00:00:00Z`),
        lte: new Date(`${to}T00:00:00Z`),
      },
      OR: [{ cityId: null }, { cityId }],
    },
    select: { date: true },
  });
  const schedule = city.officeSchedule?.isActive ? city.officeSchedule : null;
  return {
    slots: schedule?.slots ?? [],
    holidays: new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))),
  };
}
