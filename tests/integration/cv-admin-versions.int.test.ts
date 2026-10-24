// tests/integration/cv-admin-versions.int.test.ts
// Administración y las versiones de un CV (AGENTS.md §2.9 "CV: ver" y "CV: costos y margen"): solo ve las
// versiones aprobadas o reemplazadas, con costos; nunca el borrador posterior ni su comparación.
import { afterAll, describe, expect, it, vi } from "vitest";
import { getCvComparison } from "@/features/sales-control/queries/get-cv-comparison";
import { getCvEditor } from "@/features/sales-control/queries/get-cv-editor";
import {
  createCvFixture,
  createTestPrisma,
  createUserWithRoles,
  createVersion,
} from "./test-db";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

describe("Administración y las versiones de un CV", () => {
  it("ve la versión aprobada con costos y no el borrador posterior", async () => {
    const f = await createCvFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA", approvedAt: new Date() },
    });
    await createVersion(db, f.cv.id, f.userId, 2);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);

    const asked = await getCvEditor(admin, f.cv.id, 2);
    expect(asked?.versionNumber).toBe(1);
    expect(asked?.versions.map((v) => v.number)).toEqual([1]);
    expect(asked?.canSeeCosts).toBe(true);
    expect(
      await getCvComparison(admin, f.cv.id, { from: 1, to: 2 }),
    ).toBeNull();

    const creator = {
      ...(await createUserWithRoles(db, "Comercial", [{ code: "COMERCIAL" }])),
      id: f.userId,
    };
    const own = await getCvEditor(creator, f.cv.id, 2);
    expect(own?.versions.map((v) => v.number)).toEqual([2, 1]);
  });
});
