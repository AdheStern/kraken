// tests/integration/cv-admin-versions.int.test.ts
// Administración y las versiones de un CV (AGENTS.md §2.9 "CV: ver" y "CV: costos y margen", decisión 2026-11-19):
// ve todas las versiones con costos, también el borrador posterior a la aprobada, y su comparación.
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
  it("ve la versión aprobada y el borrador posterior, con costos y su comparación", async () => {
    const f = await createCvFixture(db);
    await db.cvVersion.update({
      where: { id: f.version.id },
      data: { status: "APROBADA", approvedAt: new Date() },
    });
    await createVersion(db, f.cv.id, f.userId, 2);
    const admin = await createUserWithRoles(db, "Administración", [
      { code: "ADMINISTRACION" },
    ]);

    const draft = await getCvEditor(admin, f.cv.id, 2);
    expect(draft?.versionNumber).toBe(2);
    expect(draft?.versions.map((v) => v.number)).toEqual([2, 1]);
    expect(draft?.canSeeCosts).toBe(true);
    expect(draft?.canEdit).toBe(false);

    const approved = await getCvEditor(admin, f.cv.id, 1);
    expect(approved?.canEditPostSale).toBe(true);
    expect(approved).toMatchObject({ canEditHeader: true, fxLocked: true });
    expect(
      await getCvComparison(admin, f.cv.id, { from: 1, to: 2 }),
    ).not.toBeNull();
  });
});
