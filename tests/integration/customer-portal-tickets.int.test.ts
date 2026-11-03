// tests/integration/customer-portal-tickets.int.test.ts
// Tickets del portal de clientes (AGENTS.md §2.11): la cuenta ve solo los de su empresa, nunca los
// comentarios internos, y al cerrarse sus horas descontadas.
import { afterAll, describe, expect, it, vi } from "vitest";
import { getCustomerTicket } from "@/features/tickets/queries/get-customer-ticket";
import { listCustomerTickets } from "@/features/tickets/queries/list-customer-tickets";
import type { SessionUser } from "@/server/authz/roles";
import { createTestPrisma } from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

function customerAccount(customerId: string): SessionUser {
  return {
    id: "cuenta-cliente",
    name: "Soporte ACME",
    email: "soporte@acme.test",
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

describe("portal de clientes: tickets", () => {
  it("ve solo los de su empresa", async () => {
    const own = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const other = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const user = customerAccount(own.customer.id);

    const ids = (await listCustomerTickets(user)).map((t) => t.id);
    expect(ids).toEqual([own.ticket.id]);
    expect(await getCustomerTicket(user, other.ticket.id)).toBeNull();
  });

  it("muestra los comentarios públicos y las horas descontadas, nunca los internos", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    await db.comment.createMany({
      data: [
        {
          ticketId: f.ticket.id,
          authorId: f.userId,
          body: "Interno",
          isPublic: false,
        },
        {
          ticketId: f.ticket.id,
          authorId: f.userId,
          body: "Avance",
          isPublic: true,
        },
      ],
    });
    await db.hourMovement.create({
      data: {
        bagId: f.bags[0].id,
        kind: "CONSUMO",
        minutes: -90,
        ticketId: f.ticket.id,
      },
    });
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { status: "CERRADO", closedAt: new Date() },
    });

    const detail = await getCustomerTicket(
      customerAccount(f.customer.id),
      f.ticket.id,
    );
    expect(detail?.comments.map((c) => c.body)).toEqual(["Avance"]);
    expect(detail?.chargedMinutes).toBe(90);
  });
});
