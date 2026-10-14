// prisma/seed/seed-calendar.ts
// Siembra idempotente del horario de oficina y los feriados de desarrollo; no pisa lo que cargó el administrador.
import type { Tx } from "@/server/db";
import {
  DEPARTMENTAL_HOLIDAYS,
  NATIONAL_HOLIDAYS,
  OFFICE_SCHEDULE,
} from "./dev-calendar-data";

export async function seedCalendar(tx: Tx): Promise<void> {
  const existing = await tx.officeSchedule.findUnique({
    where: { name: OFFICE_SCHEDULE.name },
  });
  const schedule =
    existing ??
    (await tx.officeSchedule.create({
      data: {
        name: OFFICE_SCHEDULE.name,
        slots: { create: OFFICE_SCHEDULE.slots },
      },
    }));
  // POR QUÉ: solo se asigna a ciudades sin horario, para no deshacer lo que eligió el administrador.
  await tx.city.updateMany({
    where: { code: { in: OFFICE_SCHEDULE.cityCodes }, officeScheduleId: null },
    data: { officeScheduleId: schedule.id },
  });

  const cities = await tx.city.findMany({ select: { id: true, code: true } });
  const cityIds = new Map(cities.map((c) => [c.code, c.id]));
  const holidays = [
    ...NATIONAL_HOLIDAYS.map((h) => ({ ...h, cityId: null })),
    ...DEPARTMENTAL_HOLIDAYS.flatMap(({ cityCode, ...h }) => {
      const cityId = cityIds.get(cityCode);
      return cityId ? [{ ...h, cityId }] : [];
    }),
  ];
  for (const { date, name, cityId } of holidays) {
    const day = new Date(`${date}T00:00:00Z`);
    const found = await tx.holiday.findFirst({ where: { date: day, cityId } });
    if (!found) await tx.holiday.create({ data: { date: day, name, cityId } });
  }
}
