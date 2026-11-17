// tests/integration/customer-groups.int.test.ts
// Grupos empresariales (decisión 2026-11-16): el nombre no se repite por mayúsculas o tildes, solo quien gestiona
// clientes los crea y la ficha del cliente lista a sus empresas hermanas.
import { afterAll, describe, expect, it, vi } from "vitest";
import { createCustomerGroup } from "@/features/admin/actions/create-customer-group";
import { upsertCustomer } from "@/features/admin/actions/upsert-customer";
import { getCustomer } from "@/features/admin/queries/get-customer";
import type { SessionUser } from "@/server/authz/roles";
import { createTestPrisma, createUserWithRoles } from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  const prisma = create();
  return {
    prisma,
    runInTransaction: (work: never) => prisma.$transaction(work),
  };
});

let sessionUser: SessionUser | null = null;
vi.mock("@/server/session", () => ({
  getSessionUser: async () => sessionUser,
}));

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const stamp = () => String(Date.now()).slice(-7);

describe("createCustomerGroup", () => {
  it("devuelve el mismo grupo aunque cambien mayúsculas, tildes o espacios", async () => {
    sessionUser = await createUserWithRoles(db, "GG", [
      { code: "GERENTE_GENERAL" },
    ]);
    const s = stamp();
    const first = await createCustomerGroup({ name: `Grupo Bísa ${s}` });
    const again = await createCustomerGroup({ name: `  grupo   bisa ${s} ` });
    expect(first.ok && again.ok).toBe(true);
    if (!first.ok || !again.ok) return;
    expect(again.data.id).toBe(first.data.id);
    expect(again.data.name).toBe(`Grupo Bísa ${s}`);
    const audits = await db.auditEvent.count({
      where: { entityId: first.data.id, action: "CREAR" },
    });
    expect(audits).toBe(1);
  });

  it("un comercial no crea grupos", async () => {
    sessionUser = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    const result = await createCustomerGroup({ name: `Grupo ${stamp()}` });
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("grupo en la ficha del cliente", () => {
  it("asigna el grupo y lista a las empresas hermanas, sin la propia", async () => {
    sessionUser = await createUserWithRoles(db, "GG", [
      { code: "GERENTE_GENERAL" },
    ]);
    const s = stamp();
    const group = await createCustomerGroup({ name: `Grupo Hermanas ${s}` });
    if (!group.ok) throw new Error(group.error.message);
    const ids: string[] = [];
    for (const name of [`Banco ${s}`, `Seguros ${s}`, `Vitalicia ${s}`]) {
      const saved = await upsertCustomer({
        id: null,
        name,
        taxId: "",
        email: "",
        phone: "",
        address: "",
        country: "Bolivia",
        industryId: null,
        companyType: null,
        municipalityId: null,
        groupId: group.data.id,
      });
      if (!saved.ok) throw new Error(saved.error.message);
      ids.push(saved.data.id);
    }
    const detail = await getCustomer(sessionUser, ids[0]);
    expect(detail?.groupId).toBe(group.data.id);
    expect(detail?.group?.siblings.map((c) => c.name)).toEqual([
      `Seguros ${s}`,
      `Vitalicia ${s}`,
    ]);
  });
});
