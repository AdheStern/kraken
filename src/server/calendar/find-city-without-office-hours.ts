// src/server/calendar/find-city-without-office-hours.ts
// Devuelve el nombre de la ciudad si no tiene un horario de oficina activo con franjas (AGENTS.md §2.5).
import type { Tx } from "@/server/db";

// REGLA: sin franjas todo el tiempo contaría fuera de horario (×2 en 8x5); el ticket no se cierra hasta que el
// administrador le asigne un horario (§2.5, decisión 2026-10-29).
export async function findCityWithoutOfficeHours(
  db: Pick<Tx, "city">,
  cityId: string,
): Promise<string | null> {
  const city = await db.city.findUniqueOrThrow({
    where: { id: cityId },
    select: {
      name: true,
      officeSchedule: {
        select: { isActive: true, _count: { select: { slots: true } } },
      },
    },
  });
  const schedule = city.officeSchedule;
  return schedule?.isActive && schedule._count.slots > 0 ? null : city.name;
}
