// tests/integration/ticket-requests.int.test.ts
// Solicitudes de ticket contra la base (AGENTS.md §2.6 «Solicitudes de ticket»): alta, aviso a quienes la
// atienden y restricciones de coherencia.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createTicketRequestRecord } from "@/server/tickets/create-ticket-request-record";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2026-10-28T14:00:00Z");

async function setup() {
  const area = await db.area.create({
    data: { code: `A${randomUUID().slice(0, 6)}`, name: "Área" },
  });
  const requester = await createUserWithRoles(db, "Vendedora", [
    { code: "COMERCIAL" },
  ]);
  const manager = await createUserWithRoles(db, "Gerente", [
    { code: "GERENTE_AREA", areaId: area.id },
  ]);
  return { area, requester, manager };
}

const inboxOf = (userId: string) =>
  db.inboxItem.findMany({
    where: { userId, eventType: "SOLICITUD_NUEVA" },
  });

const request = (areaId: string) => ({
  areaId,
  title: "No puedo entrar a la VPN",
  description: "Desde hoy en la mañana.",
});

describe("createTicketRequestRecord", () => {
  it("guarda la solicitud y avisa a los coordinadores del área, no a su gerente", async () => {
    const { area, requester, manager } = await setup();
    const coordinator = await createUserWithRoles(db, "Coordinadora", [
      { code: "COORDINADOR_SOPORTE", areaId: area.id },
    ]);
    const result = await db.$transaction((tx) =>
      createTicketRequestRecord(tx, requester, request(area.id), NOW),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const saved = await db.ticketRequest.findUniqueOrThrow({
      where: { id: result.data.requestId },
    });
    expect(saved).toMatchObject({
      requesterId: requester.id,
      areaId: area.id,
      status: "PENDIENTE",
      ticketId: null,
    });
    expect(await inboxOf(coordinator.id)).toHaveLength(1);
    expect(await inboxOf(manager.id)).toHaveLength(0);
    const mail = await db.outboxMessage.count({
      where: {
        eventType: "SOLICITUD_NUEVA",
        recipientEmail: coordinator.email,
      },
    });
    expect(mail).toBe(1);
  });

  it("sin coordinador activo avisa a los gerentes del área", async () => {
    const { area, requester, manager } = await setup();
    await db.$transaction((tx) =>
      createTicketRequestRecord(tx, requester, request(area.id), NOW),
    );
    expect(await inboxOf(manager.id)).toHaveLength(1);
  });

  it("rechaza un área dada de baja", async () => {
    const { area, requester } = await setup();
    await db.area.update({ where: { id: area.id }, data: { isActive: false } });
    const result = await db.$transaction((tx) =>
      createTicketRequestRecord(tx, requester, request(area.id), NOW),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("rechaza a un usuario sin roles", async () => {
    const { area } = await setup();
    const nobody = await createUserWithRoles(db, "Sin rol", []);
    const result = await db.$transaction((tx) =>
      createTicketRequestRecord(tx, nobody, request(area.id), NOW),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("restricciones de tickets.solicitud", () => {
  it("ATENDIDA exige ticket y DESCARTADA exige motivo", async () => {
    const { area, requester } = await setup();
    const base = { ...request(area.id), requesterId: requester.id };
    await expect(
      db.ticketRequest.create({ data: { ...base, status: "ATENDIDA" } }),
    ).rejects.toThrow(/solicitud_atendida_ck/);
    await expect(
      db.ticketRequest.create({ data: { ...base, status: "DESCARTADA" } }),
    ).rejects.toThrow(/solicitud_descartada_ck/);
  });
});
