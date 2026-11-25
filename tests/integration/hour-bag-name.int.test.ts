// tests/integration/hour-bag-name.int.test.ts
// Nombre de una bolsa (AGENTS.md §2.4 «Nombre», §2.9 «Bolsas: cambiar el nombre»): lo ponen el gerente o el
// coordinador del área, se audita, vacío vuelve a la línea del CV y no toca el saldo ni la línea.
import { afterAll, describe, expect, it, vi } from "vitest";
import { renameHourBag } from "@/features/hours/actions/rename-hour-bag";
import { getHourBag } from "@/features/hours/queries/get-hour-bag";
import type { SessionUser } from "@/server/authz/roles";
import {
  createHourBagFixture,
  createTestPrisma,
  createUserWithRoles,
} from "./test-db";

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

describe("renameHourBag", () => {
  it("el coordinador del área le pone nombre; se ve en la bolsa y se audita", async () => {
    const f = await createHourBagFixture(db);
    sessionUser = await createUserWithRoles(db, "Coordinador", [
      { code: "COORDINADOR_SOPORTE", areaId: f.area.id },
    ]);
    const result = await renameHourBag({
      bagId: f.bag.id,
      name: "  Soporte Fortinet 2026 ",
    });
    expect(result).toEqual({
      ok: true,
      data: { name: "Soporte Fortinet 2026" },
    });
    const detail = await getHourBag(sessionUser, f.bag.id);
    expect(detail?.bag).toMatchObject({
      name: "Soporte Fortinet 2026",
      customName: "Soporte Fortinet 2026",
      lineDescription: "Soporte 8x5",
    });
    expect(detail?.canRename).toBe(true);
    expect(detail?.canAdjust).toBe(false);
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityId: f.bag.id, action: "RENOMBRAR" },
    });
    expect(audit.before).toEqual({ name: null });
    expect(audit.after).toEqual({ name: "Soporte Fortinet 2026" });
  });

  it("vacío quita el nombre y vuelve a la descripción de la línea", async () => {
    const f = await createHourBagFixture(db);
    sessionUser = await createUserWithRoles(db, "Gerente", [
      { code: "GERENTE_AREA", areaId: f.area.id },
    ]);
    await renameHourBag({ bagId: f.bag.id, name: "Temporal" });
    const result = await renameHourBag({ bagId: f.bag.id, name: "   " });
    expect(result).toEqual({ ok: true, data: { name: null } });
    const detail = await getHourBag(sessionUser, f.bag.id);
    expect(detail?.bag.name).toBe("Soporte 8x5");
    const bag = await db.hourBag.findUniqueOrThrow({
      where: { id: f.bag.id },
      select: {
        balanceMinutes: true,
        cvLine: { select: { description: true } },
      },
    });
    expect(bag).toEqual({
      balanceMinutes: 0,
      cvLine: { description: "Soporte 8x5" },
    });
  });

  it("un ingeniero del área no la renombra", async () => {
    const f = await createHourBagFixture(db);
    sessionUser = await createUserWithRoles(db, "Ingeniero", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const result = await renameHourBag({ bagId: f.bag.id, name: "Otra" });
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const bag = await db.hourBag.findUniqueOrThrow({ where: { id: f.bag.id } });
    expect(bag.name).toBeNull();
  });
});
