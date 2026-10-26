// tests/integration/doc-project-data.int.test.ts
// Cabecera de un proyecto de documentación contra la base (AGENTS.md §2.10): el contacto es del cliente, el
// encargado está activo y un cliente dado de baja solo se conserva si el proyecto ya lo tenía.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { toDocProjectData } from "@/server/documentation/doc-project-data";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function fixture() {
  const owner = await createUserWithRoles(db, "Encargada", [
    { code: "INGENIERO" },
  ]);
  const customer = await db.customer.create({ data: { name: "Cliente A" } });
  const other = await db.customer.create({ data: { name: "Cliente B" } });
  const contact = await db.customerContact.create({
    data: { customerId: other.id, name: "Contacto de B" },
  });
  const technology = await db.technology.create({
    data: { name: `Tec ${randomUUID()}` },
  });
  const fields = {
    name: "Implementación SD-WAN",
    customerId: customer.id,
    contactId: null as string | null,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    technologyIds: [technology.id],
    ownerId: owner.id,
  };
  return { owner, customer, contact, fields };
}

const code = (result: { ok: boolean; error?: { code: string } }) =>
  result.ok ? "OK" : result.error?.code;

describe("cabecera de un proyecto de documentación", () => {
  it("guarda los textos vacíos como null", async () => {
    const { fields } = await fixture();
    const result = await db.$transaction((tx) =>
      toDocProjectData(tx, fields, null),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { contactName: null, contactEmail: null, contactPhone: null },
    });
  });

  it("rechaza un contacto de otro cliente y un encargado inactivo", async () => {
    const { owner, contact, fields } = await fixture();
    const wrongContact = await db.$transaction((tx) =>
      toDocProjectData(tx, { ...fields, contactId: contact.id }, null),
    );
    expect(code(wrongContact)).toBe("VALIDATION");
    await db.userProfile.update({
      where: { userId: owner.id },
      data: { isActive: false },
    });
    const inactiveOwner = await db.$transaction((tx) =>
      toDocProjectData(tx, fields, null),
    );
    expect(code(inactiveOwner)).toBe("VALIDATION");
  });

  it("un cliente dado de baja solo se acepta si el proyecto ya lo tenía", async () => {
    const { customer, fields } = await fixture();
    await db.customer.update({
      where: { id: customer.id },
      data: { isActive: false },
    });
    const create = await db.$transaction((tx) =>
      toDocProjectData(tx, fields, null),
    );
    expect(code(create)).toBe("VALIDATION");
    const keep = await db.$transaction((tx) =>
      toDocProjectData(tx, fields, customer.id),
    );
    expect(code(keep)).toBe("OK");
  });
});
