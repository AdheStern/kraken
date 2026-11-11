// tests/integration/cv-contact-address.int.test.ts
// Contactos para la cabecera del CV (AGENTS.md §2.1, decisión 2026-11-11): un contacto con sucursal activa trae la
// dirección de la sucursal; sin sucursal (o con una dada de baja) viene vacía y el CV usa la dirección general.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getCvContactOptions } from "@/features/sales-control/queries/get-cv-contact-options";
import { createTestPrisma } from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function contact(
  customerId: string,
  name: string,
  branchId: string | null,
) {
  const person = await db.contactPerson.create({
    data: { name, normalizedName: name.toUpperCase() },
  });
  return db.customerContact.create({
    data: { customerId, personId: person.id, name, branchId },
  });
}

describe("getCvContactOptions", () => {
  it("trae la dirección de la sucursal activa del contacto", async () => {
    const customer = await db.customer.create({
      data: { name: `Cliente ${randomUUID()}`, address: "Av. General 1" },
    });
    const branch = await db.customerBranch.create({
      data: { customerId: customer.id, name: "El Alto", address: "Calle 5" },
    });
    const closed = await db.customerBranch.create({
      data: {
        customerId: customer.id,
        name: "Cerrada",
        address: "Calle 9",
        isActive: false,
      },
    });
    await contact(customer.id, "Ana", branch.id);
    await contact(customer.id, "Beto", null);
    await contact(customer.id, "Carla", closed.id);

    const options = await getCvContactOptions(customer.id);

    expect(options.map((o) => [o.name, o.address])).toEqual([
      ["Ana", "Calle 5"],
      ["Beto", ""],
      ["Carla", ""],
    ]);
  });
});
