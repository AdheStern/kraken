// tests/integration/business-calendar.int.test.ts
// Calendario de una ciudad desde la base (AGENTS.md §2.5): franjas de su horario, feriados nacionales y
// propios activos, nunca los de otra ciudad; combinado con la partición del dominio.
import { randomUUID } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import { afterAll, describe, expect, it } from "vitest";
import { splitByBusinessHours } from "@/domain/calendar/split-by-business-hours";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import { createCity, createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const day = (date: string) => new Date(`${date}T00:00:00Z`);
const RANGE = { from: "2026-07-01", to: "2026-07-31" };

describe("loadBusinessCalendar", () => {
  it("junta las franjas de la ciudad con sus feriados y los nacionales activos", async () => {
    const [lp, sc] = [await createCity(db), await createCity(db)];
    const schedule = await db.officeSchedule.create({
      data: {
        name: `Oficina ${randomUUID().slice(0, 6)}`,
        slots: { create: [{ weekday: 4, startMinute: 510, endMinute: 1110 }] },
      },
    });
    await db.city.update({
      where: { id: lp.id },
      data: { officeScheduleId: schedule.id },
    });
    // POR QUÉ: fechas de 2026-07 que no usa ningún otro test, por la unicidad (fecha, ciudad).
    await db.holiday.createMany({
      data: [
        {
          date: day("2026-07-16"),
          name: "Aniversario de La Paz",
          cityId: lp.id,
        },
        {
          date: day("2026-07-17"),
          name: "Feriado de otra ciudad",
          cityId: sc.id,
        },
        { date: day("2026-07-30"), name: "Nacional de prueba", cityId: null },
        {
          date: day("2026-07-02"),
          name: "Dado de baja",
          cityId: lp.id,
          isActive: false,
        },
      ],
    });

    const calendar = await loadBusinessCalendar(db, lp.id, RANGE);
    expect(calendar.slots).toEqual([
      { weekday: 4, startMinute: 510, endMinute: 1110 },
    ]);
    expect([...calendar.holidays].sort()).toEqual(["2026-07-16", "2026-07-30"]);

    // El jueves 16/07 es feriado en La Paz: todo cuenta fuera de horario.
    const segments = splitByBusinessHours(
      {
        start: fromZonedTime("2026-07-16T10:00", "America/La_Paz"),
        end: fromZonedTime("2026-07-16T11:00", "America/La_Paz"),
      },
      calendar,
    );
    expect(segments.map((s) => s.isInside)).toEqual([false]);
  });

  it("una ciudad sin horario no tiene franjas", async () => {
    const city = await createCity(db);
    const calendar = await loadBusinessCalendar(db, city.id, RANGE);
    expect(calendar.slots).toEqual([]);
  });
});
