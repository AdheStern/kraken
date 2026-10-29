// tests/integration/ticket-requests.int.test.ts
// Solicitudes de ticket contra la base (AGENTS.md §2.6 «Solicitudes de ticket»): alta, aviso a quienes la
// atienden, ticket que nace de ella, avisos al solicitante, descarte, retiro y restricciones de coherencia.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { changeTicketStatusRecord } from "@/server/tickets/change-ticket-status-record";
import { createTicketRecord } from "@/server/tickets/create-ticket-record";
import { createTicketRequestRecord } from "@/server/tickets/create-ticket-request-record";
import { discardTicketRequestRecord } from "@/server/tickets/discard-ticket-request-record";
import { withdrawTicketRequestRecord } from "@/server/tickets/withdraw-ticket-request-record";
import {
  createHourBagFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

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
  it("guarda la solicitud y avisa a los coordinadores y a los gerentes del área", async () => {
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
    expect(await inboxOf(manager.id)).toHaveLength(1);
    const mail = await db.outboxMessage.count({
      where: {
        eventType: "SOLICITUD_NUEVA",
        recipientEmail: coordinator.email,
      },
    });
    expect(mail).toBe(1);
  });

  it("un área sin coordinadores ni gerentes activos avisa al GG", async () => {
    const { requester } = await setup();
    const lonely = await db.area.create({
      data: { code: `D${randomUUID().slice(0, 6)}`, name: "Sin nadie" },
    });
    const gg = await createUserWithRoles(db, "Gerencia", [
      { code: "GERENTE_GENERAL" },
    ]);
    await db.$transaction((tx) =>
      createTicketRequestRecord(tx, requester, request(lonely.id), NOW),
    );
    expect(await inboxOf(gg.id)).toHaveLength(1);
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

async function pendingRequest() {
  const f = await createHourBagFixture(db);
  const requester = await createUserWithRoles(db, "Vendedora", [
    { code: "COMERCIAL" },
  ]);
  const coordinator = await createUserWithRoles(db, "Coordinadora", [
    { code: "COORDINADOR_SOPORTE", areaId: f.area.id },
  ]);
  const created = await db.$transaction((tx) =>
    createTicketRequestRecord(tx, requester, request(f.area.id), NOW),
  );
  if (!created.ok) throw new Error(created.error.message);
  const ticketInput = (areaIds = [f.area.id]) => ({
    kind: "SOPORTE" as const,
    customerId: f.customer.id,
    cityId: f.city.id,
    areaIds,
    projectId: null,
    bagId: null,
    priority: "MEDIA" as const,
    slaModality: "H8X5" as const,
    title: "No puedo entrar a la VPN",
    description: "Desde hoy en la mañana.",
    ownerId: null,
    requestId: created.data.requestId,
  });
  return {
    f,
    requester,
    coordinator,
    requestId: created.data.requestId,
    ticketInput,
  };
}

const statusInbox = (userId: string) =>
  db.inboxItem.findMany({
    where: {
      userId,
      eventType: { in: ["SOLICITUD_ESTADO", "SOLICITUD_DESCARTADA"] },
    },
  });

describe("ticket que nace de una solicitud", () => {
  it("la deja ATENDIDA, enlazada y avisa al solicitante", async () => {
    const { requester, coordinator, requestId, ticketInput } =
      await pendingRequest();
    const result = await db.$transaction((tx) =>
      createTicketRecord(tx, coordinator, ticketInput(), NOW),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const saved = await db.ticketRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(saved).toMatchObject({
      status: "ATENDIDA",
      ticketId: result.data.ticketId,
      handledById: coordinator.id,
    });
    expect(await statusInbox(requester.id)).toHaveLength(1);
  });

  it("una solicitud ya atendida no crea un segundo ticket", async () => {
    const { coordinator, ticketInput } = await pendingRequest();
    await db.$transaction((tx) =>
      createTicketRecord(tx, coordinator, ticketInput(), NOW),
    );
    const second = await db.$transaction((tx) =>
      createTicketRecord(tx, coordinator, ticketInput(), NOW),
    );
    expect(second).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(
      await db.ticket.count({ where: { createdById: coordinator.id } }),
    ).toBe(1);
  });

  it("el ticket debe incluir el área de la solicitud", async () => {
    const { coordinator, ticketInput } = await pendingRequest();
    const other = await db.area.create({
      data: { code: `B${randomUUID().slice(0, 6)}`, name: "Otra" },
    });
    await db.userRole.create({
      data: {
        userId: coordinator.id,
        roleId: (
          await db.role.findUniqueOrThrow({
            where: { code: "COORDINADOR_SOPORTE" },
          })
        ).id,
        areaId: other.id,
        source: "MANUAL",
      },
    });
    const withOther = {
      ...coordinator,
      roles: [
        ...coordinator.roles,
        { code: "COORDINADOR_SOPORTE" as const, areaId: other.id },
      ],
    };
    const result = await db.$transaction((tx) =>
      createTicketRecord(tx, withOther, ticketInput([other.id]), NOW),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("un coordinador de otra área no la atiende", async () => {
    const { requestId } = await pendingRequest();
    const other = await db.area.create({
      data: { code: `C${randomUUID().slice(0, 6)}`, name: "Otra" },
    });
    const outsider = await createUserWithRoles(db, "Ajeno", [
      { code: "COORDINADOR_SOPORTE", areaId: other.id },
    ]);
    const result = await db.$transaction((tx) =>
      discardTicketRequestRecord(
        tx,
        outsider,
        { requestId, reason: "No va" },
        NOW,
      ),
    );
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("avisos al solicitante", () => {
  it("un aviso al crear el ticket con encargado y uno por cada cambio de estado", async () => {
    const { f, requester, coordinator, ticketInput } = await pendingRequest();
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const created = await db.$transaction((tx) =>
      createTicketRecord(
        tx,
        coordinator,
        { ...ticketInput(), ownerId: engineer.id },
        NOW,
      ),
    );
    if (!created.ok) throw new Error(created.error.message);
    expect(await statusInbox(requester.id)).toHaveLength(1);
    const { ticketId } = created.data;
    for (const [to, minute] of [
      ["EN_PROGRESO", 5],
      ["RESUELTO", 30],
    ] as const)
      await db.$transaction((tx) =>
        changeTicketStatusRecord(
          tx,
          engineer,
          { ticketId, to },
          new Date(NOW.getTime() + minute * 60_000),
        ),
      );
    const titles = (await statusInbox(requester.id)).map((n) => n.title);
    expect(titles).toHaveLength(3);
    expect(titles).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/lo están atendiendo$/),
        expect.stringMatching(/se resolvió$/),
      ]),
    );
  });
});

describe("discardTicketRequestRecord", () => {
  it("la descarta con motivo, avisa al solicitante y no se descarta dos veces", async () => {
    const { requester, coordinator, requestId } = await pendingRequest();
    const input = { requestId, reason: "Duplicada con el ticket #12" };
    const first = await db.$transaction((tx) =>
      discardTicketRequestRecord(tx, coordinator, input, NOW),
    );
    expect(first.ok).toBe(true);
    expect(
      await db.ticketRequest.findUniqueOrThrow({ where: { id: requestId } }),
    ).toMatchObject({ status: "DESCARTADA", discardReason: input.reason });
    expect(await statusInbox(requester.id)).toHaveLength(1);
    const again = await db.$transaction((tx) =>
      discardTicketRequestRecord(tx, coordinator, input, NOW),
    );
    expect(again).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
  });
});

describe("withdrawTicketRequestRecord", () => {
  it("quien la pidió la retira mientras está pendiente; nadie más puede", async () => {
    const { requester, coordinator, requestId, ticketInput } =
      await pendingRequest();
    const withdraw = (user: typeof requester) =>
      db.$transaction((tx) =>
        withdrawTicketRequestRecord(tx, user, { requestId }, NOW),
      );
    expect(await withdraw(coordinator)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect((await withdraw(requester)).ok).toBe(true);
    expect(
      await db.ticketRequest.findUniqueOrThrow({ where: { id: requestId } }),
    ).toMatchObject({ status: "RETIRADA", handledById: requester.id });
    expect(await withdraw(requester)).toMatchObject({
      ok: false,
      error: { code: "INVALID_STATE" },
    });
    const ticket = await db.$transaction((tx) =>
      createTicketRecord(tx, coordinator, ticketInput(), NOW),
    );
    expect(ticket).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
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
