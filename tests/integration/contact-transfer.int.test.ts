// tests/integration/contact-transfer.int.test.ts
// Transferir un contacto (decisión 2026-11-06): cierra su puesto con fecha y motivo y abre uno en el otro cliente
// para la misma persona; no se transfiere a la misma empresa ni un puesto ya cerrado. Con un contacto compartido
// cierra también los otros puestos elegidos de la persona (decisión 2026-11-16).
import { afterAll, describe, expect, it } from "vitest";
import { createContactPosition } from "@/server/customers/create-contact-position";
import { transferContactPosition } from "@/server/customers/transfer-contact-position";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());
const TODAY = new Date("2026-11-06");

async function setup() {
  const stamp = `${Date.now()}-${Math.random()}`;
  const a = await db.customer.create({ data: { name: `Banco ${stamp}` } });
  const b = await db.customer.create({ data: { name: `Minera ${stamp}` } });
  const contact = await db.$transaction((tx) =>
    createContactPosition(tx, {
      customerId: a.id,
      name: "Ana Lima",
      email: "ana@banco.bo",
    }),
  );
  return { a, b, contact };
}

describe("transferContactPosition", () => {
  it("cierra el puesto anterior y abre el nuevo para la misma persona", async () => {
    const { b, contact } = await setup();
    const { closed, opened } = await db.$transaction((tx) =>
      transferContactPosition(tx, {
        fromContactId: contact.id,
        to: {
          customerId: b.id,
          name: "Ana Lima",
          email: "ana@minera.bo",
          position: "CIO",
        },
        reason: "Pasó a Minera",
        today: TODAY,
      }),
    );
    expect(closed).toMatchObject({
      isActive: false,
      endedOn: TODAY,
      exitReason: "Pasó a Minera",
    });
    expect(opened).toMatchObject({
      personId: contact.personId,
      customerId: b.id,
      email: "ana@minera.bo",
      startedOn: TODAY,
      isActive: true,
    });
    expect(
      await db.customerContact.count({ where: { personId: contact.personId } }),
    ).toBe(2);
  });

  it("no transfiere a la misma empresa ni un puesto cerrado", async () => {
    const { a, b, contact } = await setup();
    const move = (customerId: string) =>
      db.$transaction((tx) =>
        transferContactPosition(tx, {
          fromContactId: contact.id,
          to: { customerId, name: "Ana Lima" },
          reason: "x",
          today: TODAY,
        }),
      );
    await expect(move(a.id)).rejects.toThrow(/ya trabaja en esta/);
    await move(b.id);
    await expect(move(b.id)).rejects.toThrow(/ya no está activo/);
  });

  it("cierra también los otros puestos elegidos y solo de la misma persona", async () => {
    const { a, b, contact } = await setup();
    const stamp = `${Date.now()}-${Math.random()}`;
    const [sister, other] = await Promise.all(
      ["Seguros", "Otra"].map((n) =>
        db.customer.create({ data: { name: `${n} ${stamp}` } }),
      ),
    );
    const shared = await db.$transaction((tx) =>
      createContactPosition(tx, {
        customerId: sister.id,
        personId: contact.personId,
        name: "Ana Lima",
      }),
    );
    const stranger = await db.$transaction((tx) =>
      createContactPosition(tx, { customerId: other.id, name: "Otra Persona" }),
    );
    const move = (alsoCloseIds: string[]) =>
      db.$transaction((tx) =>
        transferContactPosition(tx, {
          fromContactId: contact.id,
          alsoCloseIds,
          to: { customerId: b.id, name: "Ana Lima" },
          reason: "Pasó a Minera",
          today: TODAY,
        }),
      );
    await expect(move([stranger.id])).rejects.toThrow(/otra persona/);

    const { closed, alsoClosed, opened } = await move([shared.id]);
    expect(closed.customerId).toBe(a.id);
    expect(alsoClosed).toHaveLength(1);
    expect(alsoClosed[0]).toMatchObject({
      id: shared.id,
      isActive: false,
      endedOn: TODAY,
      exitReason: "Pasó a Minera",
    });
    expect(opened.customerId).toBe(b.id);
    const active = await db.customerContact.findMany({
      where: { personId: contact.personId, isActive: true },
    });
    expect(active.map((p) => p.customerId)).toEqual([b.id]);
  });
});
