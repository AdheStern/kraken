// src/features/calendar/queries/get-calendar-admin.ts
// Horarios con sus franjas, ciudades con su horario y feriados activos de un año, para la administración.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem (catálogo del sistema).
import { prisma } from "@/server/db";
import { toTimeText } from "../time-text";
import type { CalendarAdminData } from "../types";

export async function getCalendarAdmin(
  year: number,
): Promise<CalendarAdminData> {
  const [schedules, cities, holidays] = await Promise.all([
    prisma.officeSchedule.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slots: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
        cities: { select: { code: true }, orderBy: { code: "asc" } },
      },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, officeScheduleId: true },
    }),
    prisma.holiday.findMany({
      where: {
        isActive: true,
        date: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lte: new Date(`${year}-12-31T00:00:00Z`),
        },
      },
      orderBy: [{ date: "asc" }, { name: "asc" }],
      select: {
        id: true,
        date: true,
        name: true,
        cityId: true,
        city: { select: { code: true } },
      },
    }),
  ]);
  return {
    year,
    schedules: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      slots: s.slots.map((slot) => ({
        weekday: slot.weekday,
        start: toTimeText(slot.startMinute),
        end: toTimeText(slot.endMinute),
      })),
      cityCodes: s.cities.map((c) => c.code),
    })),
    cities: cities.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      scheduleId: c.officeScheduleId,
    })),
    holidays: holidays.map((h) => ({
      id: h.id,
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
      cityId: h.cityId,
      cityCode: h.city?.code ?? null,
    })),
  };
}
