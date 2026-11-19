// tests/integration/cv-final-price.int.test.ts
// Precio final del CV (AGENTS.md §2.3, decisión 2026-11-19): Administración y el GG lo fijan en cualquier estado
// salvo anulada, el trigger no abre los totales, queda auditado y una versión nueva no lo hereda.
import { afterAll, describe, expect, it, vi } from "vitest";
import { setCvFinalPrice } from "@/features/sales-control/actions/set-cv-final-price";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { startNewVersion } from "@/server/sales-control/start-new-version";
import {
  createCvFixture,
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

type Status = "BORRADOR" | "EN_APROBACION" | "APROBADA" | "ANULADA";

async function cvIn(status: Status) {
  const f = await createCvFixture(db);
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { totalSaleUsd: "12487.36", totalCostUsd: "9000.00" },
  });
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { status },
  });
  return f;
}

async function as(name: string, code: RoleCode) {
  sessionUser = await createUserWithRoles(db, name, [{ code }]);
  return sessionUser;
}

const input = (versionId: string, finalSaleUsd = "12500") => ({
  versionId,
  finalSaleUsd,
  finalSaleBs: "",
  reason: "Redondeo acordado con el cliente",
});

describe("setCvFinalPrice", () => {
  it.each<Status>([
    "BORRADOR",
    "EN_APROBACION",
    "APROBADA",
  ])("el GG lo fija en %s sin tocar el total calculado", async (status) => {
    const f = await cvIn(status);
    const gg = await as("GG", "GERENTE_GENERAL");
    expect(await setCvFinalPrice(input(f.version.id))).toEqual({
      ok: true,
      data: null,
    });
    const saved = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(saved.finalSaleUsd?.toFixed(2)).toBe("12500.00");
    expect(saved.finalSaleBs).toBeNull();
    expect(saved.finalBaseSaleUsd?.toFixed(2)).toBe("12487.36");
    expect(saved.totalSaleUsd.toFixed(2)).toBe("12487.36");
    expect(saved.finalPriceById).toBe(gg.id);
    const audit = await db.auditEvent.findFirst({
      where: { entityId: f.version.id, action: "PRECIO_FINAL" },
    });
    expect(audit?.actorId).toBe(gg.id);
  });

  it("Administración lo fija en un borrador y lo quita", async () => {
    const f = await cvIn("BORRADOR");
    await as("Administración", "ADMINISTRACION");
    expect((await setCvFinalPrice(input(f.version.id))).ok).toBe(true);
    const cleared = await setCvFinalPrice({
      ...input(f.version.id, ""),
      reason: "Se vuelve al calculado",
    });
    expect(cleared.ok).toBe(true);
    const saved = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(saved.finalSaleUsd).toBeNull();
    expect(saved.finalPriceReason).toBeNull();
  });

  it.each<[RoleCode]>([
    ["COMERCIAL"],
    ["DESARROLLO_NEGOCIOS"],
  ])("%s no lo fija", async (code) => {
    const f = await cvIn("APROBADA");
    await as("Otro", code);
    const result = await setCvFinalPrice(input(f.version.id));
    expect(result.ok ? null : result.error.code).toBe("FORBIDDEN");
  });

  it("en una versión anulada no se fija", async () => {
    const f = await cvIn("ANULADA");
    await as("GG", "GERENTE_GENERAL");
    const result = await setCvFinalPrice(input(f.version.id));
    expect(result.ok ? null : result.error.code).toBe("INVALID_STATE");
  });

  it("el trigger sigue protegiendo el total calculado de la versión aprobada", async () => {
    const f = await cvIn("APROBADA");
    await expect(
      db.cvVersion.update({
        where: { id: f.version.id },
        data: { totalSaleUsd: "12500.00" },
      }),
    ).rejects.toThrow(/inmutable/);
  });

  it("el CHECK exige motivo, autor y fecha", async () => {
    const f = await cvIn("BORRADOR");
    await expect(
      db.cvVersion.update({
        where: { id: f.version.id },
        data: { finalSaleUsd: "12500.00" },
      }),
    ).rejects.toThrow(/version_precio_final_ck/);
  });

  it("una versión nueva no hereda el precio final", async () => {
    const f = await cvIn("APROBADA");
    const gg = await as("GG", "GERENTE_GENERAL");
    await setCvFinalPrice(input(f.version.id));
    const created = await db.$transaction((tx) =>
      startNewVersion(tx, gg, { cvId: f.cv.id, reason: "Cambio de alcance" }),
    );
    expect(created.ok).toBe(true);
    const v2 = await db.cvVersion.findFirstOrThrow({
      where: { cvId: f.cv.id, number: 2 },
    });
    expect(v2.finalSaleUsd).toBeNull();
    expect(v2.finalPriceReason).toBeNull();
  });
});
