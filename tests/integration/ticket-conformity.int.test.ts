// tests/integration/ticket-conformity.int.test.ts
// Conformidad del cliente (AGENTS.md §2.11, decisión 2026-11-05): conforme con nota deja el ticket resuelto y avisa
// al encargado; no conforme deja su motivo público y vuelve a EN_PROGRESO; una sola respuesta por resolución,
// solo de su empresa y solo con el ticket resuelto; la tabla es inmutable y exige nota o comentario.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { answerConformityRecord } from "@/server/tickets/answer-conformity-record";
import { createTestPrisma } from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const NOW = new Date("2026-11-06T15:00:00Z");

async function account(customerId: string): Promise<SessionUser> {
  const id = randomUUID();
  await db.user.create({
    data: { id, name: "Soporte ACME", email: `${id}@acme.test` },
  });
  await db.userProfile.create({ data: { userId: id, customerId } });
  return {
    id,
    name: "Soporte ACME",
    email: `${id}@acme.test`,
    image: null,
    roles: [{ code: "CLIENTE", areaId: null }],
    customer: {
      customerId,
      seesBags: false,
      requestsWork: false,
      comments: false,
    },
  };
}

async function resolvedTicket() {
  const f = await createTicketFixture(db, []);
  await db.ticket.update({
    where: { id: f.ticket.id },
    data: { status: "RESUELTO", ownerId: f.userId },
  });
  await db.ticketStatusEvent.create({
    data: {
      ticketId: f.ticket.id,
      fromStatus: "EN_PROGRESO",
      toStatus: "RESUELTO",
      actorId: f.userId,
    },
  });
  return { ...f, client: await account(f.customer.id) };
}

const answer = (
  user: SessionUser,
  input: Parameters<typeof answerConformityRecord>[2],
) => db.$transaction((tx) => answerConformityRecord(tx, user, input, NOW));

describe("answerConformityRecord", () => {
  it("conforme con nota: queda resuelto, avisa al encargado y no admite otra respuesta", async () => {
    const f = await resolvedTicket();
    const result = await answer(f.client, {
      ticketId: f.ticket.id,
      isSatisfied: true,
      rating: 4,
    });
    expect(result).toMatchObject({ ok: true, data: { status: "RESUELTO" } });
    const notice = await db.inboxItem.findFirst({
      where: { userId: f.userId, eventType: "TICKET_CONFORMIDAD" },
    });
    expect(notice?.title).toContain("4 de 5");
    const again = await answer(f.client, {
      ticketId: f.ticket.id,
      isSatisfied: true,
      rating: 5,
    });
    expect(again).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("no conforme: el motivo queda público y el ticket vuelve a EN_PROGRESO", async () => {
    const f = await resolvedTicket();
    const result = await answer(f.client, {
      ticketId: f.ticket.id,
      isSatisfied: false,
      comment: "Sigue fallando la VPN",
    });
    expect(result).toMatchObject({ ok: true, data: { status: "EN_PROGRESO" } });
    const ticket = await db.ticket.findUniqueOrThrow({
      where: { id: f.ticket.id },
      include: { comments: true },
    });
    expect(ticket.status).toBe("EN_PROGRESO");
    expect(ticket.comments).toMatchObject([
      { body: "Sigue fallando la VPN", isPublic: true },
    ]);
  });

  it("otra empresa no responde y un ticket no resuelto tampoco", async () => {
    const f = await resolvedTicket();
    const stranger = await account(
      (await createTicketFixture(db, [])).customer.id,
    );
    expect(
      await answer(stranger, {
        ticketId: f.ticket.id,
        isSatisfied: true,
        rating: 5,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { status: "EN_PROGRESO" },
    });
    expect(
      await answer(f.client, {
        ticketId: f.ticket.id,
        isSatisfied: true,
        rating: 5,
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_STATE" } });
  });

  it("la base exige nota o comentario y no deja cambiar la respuesta", async () => {
    const f = await resolvedTicket();
    const event = await db.ticketStatusEvent.findFirstOrThrow({
      where: { ticketId: f.ticket.id, toStatus: "RESUELTO" },
    });
    const base = {
      ticketId: f.ticket.id,
      statusEventId: event.id,
      authorId: f.client.id,
    };
    await expect(
      db.ticketConformity.create({ data: { ...base, isSatisfied: false } }),
    ).rejects.toThrow(/conformidad_nota_o_comentario/);
    const row = await db.ticketConformity.create({
      data: { ...base, isSatisfied: true, rating: 5 },
    });
    await expect(
      db.ticketConformity.update({
        where: { id: row.id },
        data: { rating: 1 },
      }),
    ).rejects.toThrow(/inmutable/);
  });
});
