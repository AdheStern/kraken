// tests/integration/contact-positions.int.test.ts
// Personas y puestos de contacto (decisión 2026-11-06): el alta crea la persona con su nombre normalizado y sus
// áreas y responsables; editar el nombre lo cambia en la persona y en todos sus puestos; una persona no tiene dos
// puestos activos en el mismo cliente.
import { afterAll, describe, expect, it } from "vitest";
import { createContactPosition } from "@/server/customers/create-contact-position";
import { updateContactPosition } from "@/server/customers/update-contact-position";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function customers() {
  const stamp = Date.now() + Math.random();
  const a = await db.customer.create({ data: { name: `Banco A ${stamp}` } });
  const b = await db.customer.create({ data: { name: `Minera B ${stamp}` } });
  const area = await db.area.create({
    data: {
      code: `C${String(stamp).slice(-6).replace(".", "")}`,
      name: "Área",
    },
  });
  return { a, b, area };
}

describe("createContactPosition", () => {
  it("crea la persona y el puesto con sus áreas y responsables", async () => {
    const { a, area } = await customers();
    const seller = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    const contact = await db.$transaction((tx) =>
      createContactPosition(tx, {
        customerId: a.id,
        name: "  José   PÉREZ ",
        email: "jose@banco.bo",
        areaIds: [area.id],
        userIds: [seller.id],
      }),
    );
    const person = await db.contactPerson.findUniqueOrThrow({
      where: { id: contact.personId },
    });
    expect(person.normalizedName).toBe("jose perez");
    expect(
      await db.customerContactArea.count({ where: { contactId: contact.id } }),
    ).toBe(1);
    expect(
      await db.customerContactUser.count({ where: { contactId: contact.id } }),
    ).toBe(1);
  });

  it("el nombre editado llega a la persona y a sus puestos en otros clientes", async () => {
    const { a, b } = await customers();
    const first = await db.$transaction((tx) =>
      createContactPosition(tx, { customerId: a.id, name: "Ana Lima" }),
    );
    await db.$transaction((tx) =>
      createContactPosition(tx, {
        customerId: b.id,
        personId: first.personId,
        name: "x",
      }),
    );
    await db.$transaction((tx) =>
      updateContactPosition(tx, first.id, {
        customerId: a.id,
        name: "Ana María Lima",
      }),
    );
    const names = await db.customerContact.findMany({
      where: { personId: first.personId },
      select: { name: true },
    });
    expect(names.map((n) => n.name)).toEqual([
      "Ana María Lima",
      "Ana María Lima",
    ]);
  });

  it("no deja dos puestos activos de la misma persona en el mismo cliente", async () => {
    const { a } = await customers();
    const first = await db.$transaction((tx) =>
      createContactPosition(tx, { customerId: a.id, name: "Luis Rojas" }),
    );
    await expect(
      db.$transaction((tx) =>
        createContactPosition(tx, {
          customerId: a.id,
          personId: first.personId,
          name: "x",
        }),
      ),
    ).rejects.toThrow(/puesto_activo_unico|Unique constraint/);
  });
});
