// tests/integration/global-search.int.test.ts
// Búsqueda global (decisión 2026-11-05): cada grupo con su alcance; el comercial no encuentra el CV de otro y la
// cuenta de un cliente solo encuentra tickets de su empresa.
import { afterAll, describe, expect, it, vi } from "vitest";
import { searchEverything } from "@/features/search/queries/search-everything";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("searchEverything", () => {
  it("el comercial encuentra sus CV por cliente y no los ajenos", async () => {
    const own = await createCvFixture(db);
    const other = await createCvFixture(db);
    const seller = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    await db.cv.update({
      where: { id: own.cv.id },
      data: { createdById: seller.id },
    });

    const mine = await searchEverything(seller, own.customer.name);
    expect(
      mine.find((g) => g.label === "Control de Venta")?.items,
    ).toMatchObject([{ id: own.cv.id, hint: own.customer.name }]);
    const theirs = await searchEverything(seller, other.customer.name);
    expect(theirs.find((g) => g.label === "Control de Venta")).toBeUndefined();
    // REGLA: la ficha del cliente es para todo el personal (decisión 2026-11-06); el CV ajeno, no.
    expect(theirs.find((g) => g.label === "Clientes")?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: `/clientes/${other.customer.id}` }),
      ]),
    );
  });
});
