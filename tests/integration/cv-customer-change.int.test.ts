// tests/integration/cv-customer-change.int.test.ts
// Cambio del cliente de un CV (§2.3, decisión 2026-11-12): pasan el CV, el snapshot de todas sus versiones y sus
// bolsas; el contacto se limpia; se audita con el motivo; se rechaza si una bolsa ya la usa un ticket.
import { afterAll, describe, expect, it } from "vitest";
import { changeCvCustomerInTx } from "@/server/sales-control/change-cv-customer";
import {
  createHourBagFixture,
  createTestPrisma,
  createVersion,
} from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const oldParty = {
  name: "Anterior",
  taxId: "111",
  contactName: "Ana Lima",
  email: "ana@anterior.bo",
  phone: "700",
  address: "Calle 1",
  city: null,
  country: null,
};

async function newCustomer() {
  return db.customer.create({
    data: {
      name: `Nuevo ${Date.now()}-${Math.random()}`,
      taxId: "999",
      address: "Av. Nueva 9",
      email: "compras@nuevo.bo",
    },
  });
}

describe("changeCvCustomerInTx", () => {
  it("pasa el CV, todas sus versiones y sus bolsas al cliente nuevo y lo audita", async () => {
    const f = await createHourBagFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: {
        status: "APROBADA",
        approvedAt: new Date(),
        endCustomerId: f.customer.id,
        customerSnapshot: { customer: oldParty, endCustomer: oldParty },
      },
    });
    const draft = await createVersion(db, f.cv.id, f.userId, 2);
    const target = await newCustomer();

    const result = await db.$transaction((tx) =>
      changeCvCustomerInTx(tx, {
        cvId: f.cv.id,
        customerId: target.id,
        reason: "Se cargó en el cliente equivocado",
        actorId: f.userId,
      }),
    );

    expect(result).toEqual({ ok: true, data: { bags: 1 } });
    const cv = await db.cv.findUniqueOrThrow({ where: { id: f.cv.id } });
    expect(cv.customerId).toBe(target.id);
    const approved = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(approved.status).toBe("APROBADA");
    expect(approved.endCustomerId).toBe(target.id);
    expect(approved.customerSnapshot).toMatchObject({
      customer: {
        name: target.name,
        taxId: "999",
        contactName: null,
        address: "Av. Nueva 9",
      },
      endCustomer: { name: target.name },
    });
    const copied = await db.cvVersion.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(copied.customerSnapshot).toMatchObject({
      customer: { name: target.name },
    });
    const bag = await db.hourBag.findUniqueOrThrow({ where: { id: f.bag.id } });
    expect(bag.customerId).toBe(target.id);
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityId: f.cv.id, action: "CAMBIAR_CLIENTE" },
    });
    expect(audit.before).toEqual({ customerId: f.customer.id });
    expect(audit.after).toMatchObject({
      customerId: target.id,
      reason: "Se cargó en el cliente equivocado",
    });
  });

  it("conserva un cliente final distinto del cliente", async () => {
    const f = await createHourBagFixture(db);
    const reseller = await newCustomer();
    const endParty = { ...oldParty, name: reseller.name };
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: {
        endCustomerId: reseller.id,
        customerSnapshot: { customer: oldParty, endCustomer: endParty },
      },
    });
    const target = await newCustomer();

    await db.$transaction((tx) =>
      changeCvCustomerInTx(tx, {
        cvId: f.cv.id,
        customerId: target.id,
        reason: "Corrección",
        actorId: f.userId,
      }),
    );

    const version = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(version.endCustomerId).toBe(reseller.id);
    expect(version.customerSnapshot).toMatchObject({ endCustomer: endParty });
  });

  it("se rechaza si una bolsa del CV ya está en un ticket y no cambia nada", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H8X5", minutes: 600 },
    ]);
    const target = await newCustomer();

    const result = await db.$transaction((tx) =>
      changeCvCustomerInTx(tx, {
        cvId: f.cv.id,
        customerId: target.id,
        reason: "Corrección",
        actorId: f.userId,
      }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    if (!result.ok)
      expect(result.error.message).toContain(`#${f.ticket.number}`);
    const cv = await db.cv.findUniqueOrThrow({ where: { id: f.cv.id } });
    expect(cv.customerId).toBe(f.customer.id);
    const bag = await db.hourBag.findUniqueOrThrow({
      where: { id: f.bags[0].id },
    });
    expect(bag.customerId).toBe(f.customer.id);
  });

  it("rechaza el mismo cliente o uno dado de baja", async () => {
    const f = await createHourBagFixture(db);
    const inactive = await db.customer.create({
      data: { name: `Baja ${Date.now()}`, isActive: false },
    });
    const run = (customerId: string) =>
      db.$transaction((tx) =>
        changeCvCustomerInTx(tx, {
          cvId: f.cv.id,
          customerId,
          reason: "Corrección",
          actorId: f.userId,
        }),
      );

    expect(await run(f.customer.id)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
    expect(await run(inactive.id)).toMatchObject({
      ok: false,
      error: { code: "VALIDATION" },
    });
  });
});
