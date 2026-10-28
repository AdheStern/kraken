// tests/integration/ticket-sla.int.test.ts
// SLA contra la base (AGENTS.md §2.7, §7 sla.evaluate): las mediciones siguen el historial, se pausan con la
// espera del cliente, se cumplen al resolver y el aviso del 75 % sale una sola vez.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Tx } from "@/server/db";
import { evaluateSla } from "@/server/sla/evaluate-sla";
import { changeTicketStatusRecord } from "@/server/tickets/change-ticket-status-record";
import { createTicketRecord } from "@/server/tickets/create-ticket-record";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const T0 = new Date("2026-10-19T13:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const run = <T>(work: (tx: Tx) => Promise<T>) => db.$transaction(work);

beforeAll(async () => {
  // POR QUÉ: 24x7 para que el reloj no dependa del horario; la base de pruebas no trae políticas sembradas.
  await db.slaPolicy.upsert({
    where: { modality_priority: { modality: "H24X7", priority: "ALTA" } },
    create: {
      modality: "H24X7",
      priority: "ALTA",
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
    },
    update: {
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
      isActive: true,
    },
  });
});

async function newTicket() {
  const f = await createCvFixture(db);
  const coordinator = await createUserWithRoles(db, "Coordinadora", [
    { code: "COORDINADOR_SOPORTE", areaId: f.area.id },
  ]);
  const engineer = await createUserWithRoles(db, "Ingeniera", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  const created = await run((tx) =>
    createTicketRecord(
      tx,
      coordinator,
      {
        kind: "SOPORTE",
        customerId: f.customer.id,
        cityId: f.city.id,
        areaIds: [f.area.id],
        projectId: null,
        bagId: null,
        priority: "ALTA",
        slaModality: "H24X7",
        title: "Caída del enlace",
        description: "Sin internet en la sucursal.",
        ownerId: engineer.id,
      },
      T0,
    ),
  );
  if (!created.ok) throw new Error(created.error.message);
  return { ticketId: created.data.ticketId, coordinator, engineer };
}

const measurements = async (ticketId: string) =>
  Object.fromEntries(
    (await db.slaMeasurement.findMany({ where: { ticketId } })).map((m) => [
      m.kind,
      m,
    ]),
  );

describe("SLA del ticket", () => {
  it("avisa una sola vez al 75 % de la primera respuesta, al encargado y al coordinador", async () => {
    const { ticketId, coordinator, engineer } = await newTicket();
    expect((await measurements(ticketId)).PRIMERA_RESPUESTA).toMatchObject({
      status: "EN_CURSO",
      targetMinutes: 60,
      elapsedMinutes: 0,
    });

    await evaluateSla(db, { now: () => at(50) });
    await evaluateSla(db, { now: () => at(55) });
    expect((await measurements(ticketId)).PRIMERA_RESPUESTA).toMatchObject({
      elapsedMinutes: 55,
      status: "EN_CURSO",
    });
    for (const userId of [engineer.id, coordinator.id])
      expect(
        await db.inboxItem.count({
          where: {
            userId,
            eventType: "SLA_ALERTA",
            link: `/tickets/${ticketId}`,
          },
        }),
      ).toBe(1);
  });

  it("la espera del cliente pausa la resolución y resolver la cumple", async () => {
    const { ticketId, engineer } = await newTicket();
    const move = (
      to: "EN_PROGRESO" | "EN_ESPERA_CLIENTE" | "RESUELTO",
      minute: number,
    ) =>
      run((tx) =>
        changeTicketStatusRecord(tx, engineer, { ticketId, to }, at(minute)),
      );

    await move("EN_PROGRESO", 10);
    await move("EN_ESPERA_CLIENTE", 40);
    let sla = await measurements(ticketId);
    expect(sla.PRIMERA_RESPUESTA).toMatchObject({
      status: "CUMPLIDO",
      elapsedMinutes: 10,
    });
    expect(sla.RESOLUCION).toMatchObject({
      status: "PAUSADO",
      elapsedMinutes: 40,
      dueAt: null,
    });

    await move("EN_PROGRESO", 200);
    await move("RESUELTO", 260);
    sla = await measurements(ticketId);
    expect(sla.RESOLUCION).toMatchObject({
      status: "CUMPLIDO",
      elapsedMinutes: 100,
      metAt: at(260),
    });
  });
});
