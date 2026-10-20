// tests/integration/ticket-queries.int.test.ts
// Listado, detalle y bolsas de un ticket contra la base (AGENTS.md §2.9 "Tickets: ver", §2.6 consumo
// proyectado): cada rol ve lo suyo y la proyección usa la misma asignación del cierre.
import { afterAll, describe, expect, it, vi } from "vitest";
import { getCvHoursView } from "@/features/sales-control/queries/get-cv-hours-view";
import { getTicketBags } from "@/features/tickets/queries/get-ticket-bags";
import { getTicketDetail } from "@/features/tickets/queries/get-ticket-detail";
import { getTicketTime } from "@/features/tickets/queries/get-ticket-time";
import { listTickets } from "@/features/tickets/queries/list-tickets";
import { startTimerRecord } from "@/server/tickets/start-timer-record";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { addTimeEntry, createTicketFixture } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("tickets visibles", () => {
  it("el ingeniero ve sus tickets, el comercial los de clientes de sus CV y Administración ninguno", async () => {
    const f = await createTicketFixture(db, []);
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const outsider = await createUserWithRoles(db, "Otro ingeniero", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { ownerId: engineer.id },
    });
    // El creador del CV de prueba es el comercial del cliente.
    const commercial = {
      ...(await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }])),
      id: f.userId,
    };

    const ids = async (user: typeof engineer) =>
      (await listTickets(user, { customerId: f.customer.id })).map((t) => t.id);
    expect(await ids(engineer)).toEqual([f.ticket.id]);
    expect(await ids(outsider)).toEqual([]);
    expect(await ids(commercial)).toEqual([f.ticket.id]);
    expect(await ids(admin)).toEqual([]);
    expect(await ids(f.coordinator)).toEqual([f.ticket.id]);

    expect(await getTicketDetail(outsider, f.ticket.id)).toBeNull();
    const detail = await getTicketDetail(engineer, f.ticket.id);
    expect(detail?.permissions).toMatchObject({
      canManage: true,
      canClose: false,
      canLogTime: true,
      transitions: ["EN_PROGRESO"],
    });
  });
});

describe("bolsas del ticket", () => {
  it("proyecta HORAS-01 con la misma asignación del cierre y ofrece solo bolsas elegibles", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 180 },
      { modality: "H8X5", minutes: 600 },
    ]);
    const extra = await createTicketFixture(db, [
      { modality: "H24X7", minutes: 60 },
    ]);
    await addTimeEntry(db, f.ticket.id, "2026-10-16T17:30", "2026-10-16T18:00");
    await addTimeEntry(db, f.ticket.id, "2026-10-16T18:15", "2026-10-16T19:30");
    await addTimeEntry(db, f.ticket.id, "2026-10-17T10:00", "2026-10-17T10:40");

    const panel = await getTicketBags(f.coordinator, f.ticket.id);
    expect(panel?.projection).toEqual({
      realMinutes: 145,
      chargedMinutes: 270,
      pendingMinutes: 0,
      waivedMinutes: 0,
    });
    expect(
      panel?.hierarchy.map((h) => [h.priority, h.projectedMinutes]),
    ).toEqual([
      [1, 180],
      [2, 90],
    ]);
    expect(panel?.eligible.map((b) => b.id)).not.toContain(extra.bags[0].id);
    // La proyección no mueve saldos.
    expect(
      (await db.hourBag.findUniqueOrThrow({ where: { id: f.bags[0].id } }))
        .balanceMinutes,
    ).toBe(180);
  });
});

describe("tiempo del ticket", () => {
  it("muestra el contador abierto del usuario y dónde puede registrar", async () => {
    const f = await createTicketFixture(db, []);
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { ownerId: engineer.id, status: "EN_PROGRESO" },
    });
    await db.$transaction((tx) =>
      startTimerRecord(tx, engineer, {
        ticketId: f.ticket.id,
        subtaskId: null,
      }),
    );

    const time = await getTicketTime(engineer, f.ticket.id);
    expect(time?.timers).toEqual([
      expect.objectContaining({ status: "CORRIENDO", ticketId: f.ticket.id }),
    ]);
    expect(time?.targets).toEqual([{ id: null, label: "El ticket" }]);
    expect(time?.entries).toHaveLength(1);
    expect((await getTicketTime(f.coordinator, f.ticket.id))?.targets).toEqual(
      [],
    );
  });
});

describe("CV visto por el ingeniero", () => {
  it("muestra cabecera y horas de los CV de sus tickets, sin montos, y nada a otros", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const outsider = await createUserWithRoles(db, "Otro", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { ownerId: engineer.id },
    });
    const hours = await db.unit.create({
      data: { code: `H${f.city.code}`, name: "Horas", isHours: true },
    });
    await db.cvLine.updateMany({
      where: { versionId: f.version.id },
      data: { itemType: "SERVICIO", unitId: hours.id },
    });
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA" },
    });

    const view = await getCvHoursView(engineer, f.cv.id);
    expect(view?.lines).toHaveLength(1);
    expect(view?.lines[0]).toMatchObject({
      hours: "10",
      bag: { balanceMinutes: 600 },
    });
    expect(JSON.stringify(view)).not.toMatch(/Usd|cost|sale|factor/i);
    expect(await getCvHoursView(outsider, f.cv.id)).toBeNull();
  });
});
