// tests/integration/contact-scope.int.test.ts
// Alcance de contactos (decisión 2026-11-06): quien no gestiona contactos ve solo los asociados a sus áreas; un
// contacto sin área lo ven solo quienes gestionan.
import { afterAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { createContactPosition } from "@/server/customers/create-contact-position";
import { createTestPrisma } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

function member(
  code: SessionUser["roles"][number]["code"],
  areaId: string | null,
): SessionUser {
  return {
    id: "x",
    name: "X",
    email: "x@dima.test",
    image: null,
    roles: [{ code, areaId }],
  };
}

describe("scopeContactQuery", () => {
  it("filtra por área a quien no gestiona y deja todo a quien gestiona", async () => {
    const stamp = String(Date.now()).slice(-6);
    const customer = await db.customer.create({
      data: { name: `Cliente alcance ${stamp}` },
    });
    const [mine, other] = await Promise.all(
      ["M", "O"].map((p) =>
        db.area.create({ data: { code: `${p}${stamp}`, name: `Área ${p}` } }),
      ),
    );
    const make = (name: string, areaIds: string[]) =>
      db.$transaction((tx) =>
        createContactPosition(tx, { customerId: customer.id, name, areaIds }),
      );
    const inMine = await make("Ana Mía", [mine.id]);
    await make("Beto Otra", [other.id]);
    await make("Carla Sin Área", []);
    const visible = (user: SessionUser) =>
      db.customerContact
        .findMany({
          where: {
            AND: [{ customerId: customer.id }, scopeContactQuery(user)],
          },
        })
        .then((rows) => rows.map((r) => r.id));
    expect(await visible(member("INGENIERO", mine.id))).toEqual([inMine.id]);
    expect(await visible(member("COMERCIAL", null))).toEqual([]);
    expect(await visible(member("GERENTE_AREA", other.id))).toHaveLength(3);
    expect(await visible(member("DESARROLLO_NEGOCIOS", null))).toHaveLength(3);
  });
});
