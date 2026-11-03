// tests/integration/cv-header-any-state.int.test.ts
// Cabecera de un CV fuera de BORRADOR (AGENTS.md §2.3, decisión 2026-11-03): se guarda sin tocar los TC, se
// audita solo lo que cambió y se copia a la versión posterior aún sin aprobar.
import { afterAll, describe, expect, it } from "vitest";
import { copyVersionContent } from "@/server/sales-control/copy-version-content";
import { saveCvHeader } from "@/server/sales-control/save-cv-header";
import { createCvFixture, createTestPrisma, createVersion } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

async function approvedWithDraft() {
  const f = await createCvFixture(db);
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { status: "APROBADA", approvedAt: new Date() },
  });
  const draft = await createVersion(db, f.cv.id, f.userId, 2);
  await copyVersionContent(db, f.version.id, draft.id, { sameSale: true });
  const approved = await db.cvVersion.findUniqueOrThrow({
    where: { id: f.version.id },
  });
  return { f, draft, approved };
}

describe("saveCvHeader fuera de borrador", () => {
  it("guarda sin tocar los TC, audita lo que cambió y lo copia a la versión siguiente", async () => {
    const { f, draft, approved } = await approvedWithDraft();

    await db.$transaction((tx) =>
      saveCvHeader(tx, {
        versionId: f.version.id,
        cvId: f.cv.id,
        isDraft: false,
        sellerIds: [f.userId],
        fx: null,
        actorId: f.userId,
        header: {
          title: "Título corregido",
          issuedOn: approved.issuedOn,
          presalesId: null,
          postsalesId: null,
          mainTechnologyId: null,
          serviceTypeId: null,
          isNewTechnology: false,
          endCustomerId: null,
          customerSnapshot: approved.customerSnapshot ?? {},
          customerPoNumber: "OC-2026-15",
          customerPoDate: null,
          paymentTerms: null,
          deliveryOn: null,
          notes: null,
        },
      }),
    );

    const saved = await db.cvVersion.findUniqueOrThrow({
      where: { id: f.version.id },
    });
    expect(saved).toMatchObject({
      title: "Título corregido",
      customerPoNumber: "OC-2026-15",
      status: "APROBADA",
    });
    expect(saved.costFxRate.toString()).toBe(approved.costFxRate.toString());
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityId: f.version.id, action: "EDITAR_CABECERA" },
    });
    expect(Object.keys(audit.after as object).sort()).toEqual([
      "customerPoNumber",
      "sellerIds",
      "title",
    ]);
    const copied = await db.cvVersion.findUniqueOrThrow({
      where: { id: draft.id },
      include: { sellers: true },
    });
    expect(copied).toMatchObject({
      title: "Título corregido",
      customerPoNumber: "OC-2026-15",
    });
    expect(copied.sellers.map((s) => s.userId)).toEqual([f.userId]);
  });
});
