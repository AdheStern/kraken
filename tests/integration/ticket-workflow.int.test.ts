// tests/integration/ticket-workflow.int.test.ts
// Ciclo de un ticket contra la base (AGENTS.md §2.6, §2.7, §8): alta con encargado, permisos, transiciones con
// su historial inmutable, primera respuesta y resolución.
import { afterAll, describe, expect, it } from "vitest";
import type { Tx } from "@/server/db";
import { addTicketComment } from "@/server/tickets/add-ticket-comment";
import { assignTicketOwner } from "@/server/tickets/assign-ticket-owner";
import { changeTicketStatusRecord } from "@/server/tickets/change-ticket-status-record";
import {
  createTicketRecord,
  type NewTicket,
} from "@/server/tickets/create-ticket-record";
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

async function setup() {
  const f = await createCvFixture(db);
  const coordinator = await createUserWithRoles(db, "Coordinadora", [
    { code: "COORDINADOR_SOPORTE", areaId: f.area.id },
  ]);
  const engineer = await createUserWithRoles(db, "Ingeniera", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  const commercial = await createUserWithRoles(db, "Comercial", [
    { code: "COMERCIAL" },
  ]);
  const input: NewTicket = {
    kind: "SOPORTE",
    customerId: f.customer.id,
    cityId: f.city.id,
    areaIds: [f.area.id],
    projectId: null,
    priority: "ALTA",
    slaModality: "H8X5",
    title: "Switch core caído",
    description: "El cliente no tiene red en el piso 3.",
    ownerId: engineer.id,
  };
  return { f, coordinator, engineer, commercial, input };
}

const statuses = async (ticketId: string) =>
  (
    await db.ticketStatusEvent.findMany({
      where: { ticketId },
      orderBy: { occurredAt: "asc" },
    })
  ).map((e) => `${e.fromStatus ?? "∅"}→${e.toStatus}`);

describe("ciclo del ticket", () => {
  it("el coordinador crea con encargado: nace ASIGNADO y avisa al ingeniero", async () => {
    const { coordinator, engineer, input } = await setup();
    const result = await run((tx) =>
      createTicketRecord(tx, coordinator, input, T0),
    );
    if (!result.ok) throw new Error(result.error.message);
    const { ticketId } = result.data;
    expect(await statuses(ticketId)).toEqual(["∅→NUEVO", "NUEVO→ASIGNADO"]);
    expect(
      await db.inboxItem.count({
        where: { userId: engineer.id, eventType: "TICKET_ASIGNADO" },
      }),
    ).toBe(1);
  });

  it("rechaza al ingeniero como creador y a un encargado que no es ingeniero del área", async () => {
    const { coordinator, engineer, commercial, input } = await setup();
    const asEngineer = await run((tx) =>
      createTicketRecord(tx, engineer, input, T0),
    );
    expect(asEngineer.ok ? "OK" : asEngineer.error.code).toBe("FORBIDDEN");
    const wrongOwner = await run((tx) =>
      createTicketRecord(
        tx,
        coordinator,
        { ...input, ownerId: commercial.id },
        T0,
      ),
    );
    expect(wrongOwner.ok ? "OK" : wrongOwner.error.code).toBe("VALIDATION");
  });

  it("el encargado lo trabaja hasta RESUELTO con su historial; el comercial no lo mueve", async () => {
    const { coordinator, engineer, commercial, input } = await setup();
    const created = await run((tx) =>
      createTicketRecord(tx, coordinator, { ...input, ownerId: null }, T0),
    );
    if (!created.ok) throw new Error(created.error.message);
    const { ticketId } = created.data;
    const move = (
      user: typeof engineer,
      to: "EN_PROGRESO" | "EN_ESPERA_CLIENTE" | "RESUELTO",
      minute: number,
    ) =>
      run((tx) =>
        changeTicketStatusRecord(tx, user, { ticketId, to }, at(minute)),
      );

    expect((await move(engineer, "EN_PROGRESO", 5)).ok).toBe(false);
    await run((tx) =>
      assignTicketOwner(
        tx,
        coordinator,
        { ticketId, ownerId: engineer.id },
        at(10),
      ),
    );
    expect((await move(commercial, "EN_PROGRESO", 15)).ok).toBe(false);
    for (const [to, minute] of [
      ["EN_PROGRESO", 20],
      ["EN_ESPERA_CLIENTE", 30],
      ["EN_PROGRESO", 90],
      ["RESUELTO", 120],
    ] as const)
      expect((await move(engineer, to, minute)).ok).toBe(true);

    expect(await statuses(ticketId)).toEqual([
      "∅→NUEVO",
      "NUEVO→ASIGNADO",
      "ASIGNADO→EN_PROGRESO",
      "EN_PROGRESO→EN_ESPERA_CLIENTE",
      "EN_ESPERA_CLIENTE→EN_PROGRESO",
      "EN_PROGRESO→RESUELTO",
    ]);
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(ticket).toMatchObject({
      status: "RESUELTO",
      firstResponseAt: at(20),
      resolvedAt: at(120),
    });
  });

  it("el primer comentario público del encargado es su primera respuesta; el comercial no comenta", async () => {
    const { coordinator, engineer, commercial, input } = await setup();
    const created = await run((tx) =>
      createTicketRecord(tx, coordinator, input, T0),
    );
    if (!created.ok) throw new Error(created.error.message);
    const { ticketId } = created.data;
    const comment = (
      user: typeof engineer,
      isPublic: boolean,
      minute: number,
    ) =>
      run((tx) =>
        addTicketComment(
          tx,
          user,
          { ticketId, body: "Revisando", isPublic },
          at(minute),
        ),
      );

    expect((await comment(commercial, true, 1)).ok).toBe(false);
    await comment(engineer, false, 2);
    await comment(engineer, true, 7);
    await comment(engineer, true, 9);
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: ticketId },
    });
    expect(ticket.firstResponseAt).toEqual(at(7));
  });

  it("el historial de estados es inmutable", async () => {
    const { coordinator, input } = await setup();
    const created = await run((tx) =>
      createTicketRecord(tx, coordinator, input, T0),
    );
    if (!created.ok) throw new Error(created.error.message);
    await expect(
      db.ticketStatusEvent.deleteMany({
        where: { ticketId: created.data.ticketId },
      }),
    ).rejects.toThrow(/inmutable/);
  });
});
