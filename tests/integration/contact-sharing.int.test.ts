// tests/integration/contact-sharing.int.test.ts
// Contactos compartidos entre empresas (decisión 2026-11-16): compartir abre puestos de la misma persona sin
// duplicarla ni repetir empresas, suma las áreas de quien comparte, no deja compartir lo que uno no ve, y al editar
// se propagan correo y teléfono solo a los puestos activos elegidos de la misma persona.
import { afterAll, describe, expect, it, vi } from "vitest";
import { shareCustomerContact } from "@/features/admin/actions/share-customer-contact";
import { upsertCustomerContact } from "@/features/admin/actions/upsert-customer-contact";
import { getCustomer } from "@/features/admin/queries/get-customer";
import type { SessionUser } from "@/server/authz/roles";
import { createContactPosition } from "@/server/customers/create-contact-position";
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

async function world() {
  const s = `${Date.now() % 10_000_000}${Math.floor(Math.random() * 90)}`;
  const [bank, insurer, life, other] = await Promise.all(
    ["Banco", "Seguros", "Vitalicia", "Otra"].map((n) =>
      db.customer.create({ data: { name: `${n} ${s}` } }),
    ),
  );
  const [net, soft] = await Promise.all(
    ["N", "S"].map((p) =>
      db.area.create({ data: { code: `${p}${s}`, name: `Área ${p}${s}` } }),
    ),
  );
  const source = await db.$transaction((tx) =>
    createContactPosition(tx, {
      customerId: bank.id,
      name: `Alejandra Vargas ${s}`,
      position: "Jefa de TI",
      email: `avargas${s}@bisa.test`,
      phone: "71234567",
      areaIds: [net.id],
    }),
  );
  return { bank, insurer, life, other, net, soft, source };
}

const gg = () => createUserWithRoles(db, "GG", [{ code: "GERENTE_GENERAL" }]);

describe("shareCustomerContact", () => {
  it("abre un puesto por empresa con la misma persona y salta donde ya está", async () => {
    const w = await world();
    sessionUser = await gg();
    const first = await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id],
    });
    expect(first).toEqual({ ok: true, data: { created: 1, skipped: 0 } });
    const again = await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id, w.life.id, w.bank.id],
    });
    expect(again).toEqual({ ok: true, data: { created: 1, skipped: 2 } });

    const positions = await db.customerContact.findMany({
      where: { personId: w.source.personId, isActive: true },
      include: { areas: true },
    });
    expect(positions.map((p) => p.customerId).sort()).toEqual(
      [w.bank.id, w.insurer.id, w.life.id].sort(),
    );
    const shared = positions.find((p) => p.customerId === w.life.id);
    expect(shared).toMatchObject({
      email: w.source.email,
      phone: "71234567",
      position: "Jefa de TI",
      branchId: null,
    });
    expect(shared?.areas.map((a) => a.areaId)).toEqual([w.net.id]);
  });

  it("quien no gestiona suma sus áreas y no comparte lo que no ve", async () => {
    const w = await world();
    sessionUser = await createUserWithRoles(db, "Comercial SOFT", [
      { code: "COMERCIAL", areaId: w.soft.id },
    ]);
    const hidden = await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id],
    });
    expect(hidden).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });

    sessionUser = await createUserWithRoles(db, "Comercial NET", [
      { code: "COMERCIAL", areaId: w.net.id },
      { code: "COMERCIAL", areaId: w.soft.id },
    ]);
    const ok = await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id],
    });
    expect(ok).toMatchObject({ ok: true });
    const shared = await db.customerContact.findFirstOrThrow({
      where: { personId: w.source.personId, customerId: w.insurer.id },
      include: { areas: true },
    });
    expect(shared.areas.map((a) => a.areaId).sort()).toEqual(
      [w.net.id, w.soft.id].sort(),
    );
  });

  it("una cuenta del portal no comparte", async () => {
    const w = await world();
    const portal = await createUserWithRoles(db, "Portal", [
      { code: "CLIENTE" },
    ]);
    sessionUser = {
      ...portal,
      customer: {
        customerId: w.bank.id,
        seesBags: false,
        requestsWork: false,
        comments: false,
      },
    };
    const result = await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id],
    });
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});

describe("mismos datos en todas las empresas", () => {
  it("propaga correo y teléfono solo a los puestos elegidos de la misma persona", async () => {
    const w = await world();
    sessionUser = await gg();
    await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id, w.life.id],
    });
    const stranger = await db.$transaction((tx) =>
      createContactPosition(tx, {
        customerId: w.other.id,
        name: "Otra Persona",
        email: "otra@test.bo",
      }),
    );
    const [insurer, life] = await Promise.all(
      [w.insurer.id, w.life.id].map((customerId) =>
        db.customerContact.findFirstOrThrow({
          where: { personId: w.source.personId, customerId },
        }),
      ),
    );

    const detail = await getCustomer(sessionUser, w.bank.id);
    const view = detail?.contacts.find((c) => c.id === w.source.id);
    expect(view?.otherActive.map((s) => s.customerId).sort()).toEqual(
      [w.insurer.id, w.life.id].sort(),
    );

    const saved = await upsertCustomerContact({
      id: w.source.id,
      customerId: w.bank.id,
      name: w.source.name,
      position: "Jefa de TI",
      email: "nueva@bisa.test",
      phone: "70000001",
      syncContactIds: [insurer.id, stranger.id],
    });
    expect(saved).toMatchObject({ ok: true });
    const after = await db.customerContact.findMany({
      where: { id: { in: [insurer.id, life.id, stranger.id] } },
    });
    const byId = new Map(after.map((c) => [c.id, c]));
    expect(byId.get(insurer.id)).toMatchObject({
      email: "nueva@bisa.test",
      phone: "70000001",
    });
    expect(byId.get(life.id)?.email).toBe(w.source.email);
    expect(byId.get(stranger.id)?.email).toBe("otra@test.bo");
  });

  it("la ficha no muestra puestos hermanos fuera del alcance de quien mira", async () => {
    const w = await world();
    sessionUser = await gg();
    await shareCustomerContact({
      contactId: w.source.id,
      customerIds: [w.insurer.id],
    });
    const insurer = await db.customerContact.findFirstOrThrow({
      where: { personId: w.source.personId, customerId: w.insurer.id },
    });
    await db.customerContactArea.deleteMany({
      where: { contactId: insurer.id },
    });
    await db.customerContactArea.create({
      data: { contactId: insurer.id, areaId: w.soft.id },
    });
    const viewer = await createUserWithRoles(db, "Ingeniero NET", [
      { code: "INGENIERO", areaId: w.net.id },
    ]);
    const detail = await getCustomer(viewer, w.bank.id);
    const view = detail?.contacts.find((c) => c.id === w.source.id);
    expect(view).toBeDefined();
    expect(view?.otherActive).toEqual([]);
  });
});
