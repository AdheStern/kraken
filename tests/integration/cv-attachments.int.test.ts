// tests/integration/cv-attachments.int.test.ts
// Adjuntos del CV contra la base (AGENTS.md §2.1, §2.9, ADR-16): el comercial dueño sube y quita, el archivo queda
// en el almacén con su hash y auditoría, la preventa no ve ni sube (regla 12) y otro usuario no quita lo ajeno.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getCvAttachments } from "@/features/sales-control/queries/get-cv-attachments";
import { LocalFileStore } from "@/server/files/local-file-store";
import { deleteCvAttachmentRecord } from "@/server/sales-control/delete-cv-attachment-record";
import { uploadCvAttachment } from "@/server/sales-control/upload-cv-attachment";
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

const db = createTestPrisma();
let root: string;
let store: LocalFileStore;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "kraken-cv-files-"));
  store = new LocalFileStore(root);
});
afterAll(async () => {
  await db.$disconnect();
  await rm(root, { recursive: true, force: true });
});

const file = (text: string, name = "licencias.xlsx") =>
  new File([text], name, { type: "application/octet-stream" });

async function fixture() {
  const f = await createCvFixture(db);
  const seller = await createUserWithRoles(db, "Comercial", [
    { code: "COMERCIAL" },
  ]);
  await db.cvVersionSeller.create({
    data: { versionId: f.version.id, userId: seller.id },
  });
  const presales = await createUserWithRoles(db, "Preventa", [
    { code: "PREVENTA" },
  ]);
  await db.cvVersion.update({
    where: { id: f.version.id },
    data: { presalesId: presales.id },
  });
  return { ...f, seller, presales };
}

describe("adjuntos del CV", () => {
  it("el vendedor sube, ve y quita; queda en el almacén y en la auditoría", async () => {
    const f = await fixture();
    const result = await uploadCvAttachment(
      f.seller,
      { cvId: f.cv.id, kind: "OTRO", file: file("detalle") },
      store,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const saved = await db.cvAttachment.findUniqueOrThrow({
      where: { id: result.data.attachmentId },
    });
    expect(saved).toMatchObject({
      versionId: f.version.id,
      fileName: "licencias.xlsx",
      sizeBytes: 7,
    });
    expect(saved.storagePath).toContain(`cv/${f.cv.code}/`);
    expect(new TextDecoder().decode(await store.get(saved.storagePath))).toBe(
      "detalle",
    );
    const view = await getCvAttachments(f.seller, f.cv.id);
    expect(view?.items).toHaveLength(1);
    expect(view?.items[0]).toMatchObject({ canDelete: true, kind: "OTRO" });
    const audit = await db.auditEvent.findFirst({
      where: { entity: "cv.adjunto", entityId: saved.id, action: "SUBIR" },
    });
    expect(audit).not.toBeNull();

    const removed = await db.$transaction((tx) =>
      deleteCvAttachmentRecord(tx, f.seller, saved.id),
    );
    expect(removed.ok).toBe(true);
    expect(await db.cvAttachment.count({ where: { cvId: f.cv.id } })).toBe(0);
  });

  it("la preventa no ve ni sube adjuntos (regla 12)", async () => {
    const f = await fixture();
    expect(await getCvAttachments(f.presales, f.cv.id)).toBeNull();
    const result = await uploadCvAttachment(
      f.presales,
      { cvId: f.cv.id, kind: "OTRO", file: file("x") },
      store,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("otro gerente del área no quita lo que subió el vendedor", async () => {
    const f = await fixture();
    await db.cvLine.create({
      data: {
        versionId: f.version.id,
        position: 1,
        kind: "ITEM",
        areaId: f.area.id,
        description: "Licencia",
      },
    });
    const manager = await createUserWithRoles(db, "Gerente", [
      { code: "GERENTE_AREA", areaId: f.area.id },
    ]);
    const uploaded = await uploadCvAttachment(
      f.seller,
      { cvId: f.cv.id, kind: "OC_CLIENTE", file: file("oc", "oc.pdf") },
      store,
    );
    if (!uploaded.ok) throw new Error("no subió");
    const view = await getCvAttachments(manager, f.cv.id);
    expect(view?.items[0]?.canDelete).toBe(false);
    const removed = await db.$transaction((tx) =>
      deleteCvAttachmentRecord(tx, manager, uploaded.data.attachmentId),
    );
    expect(removed).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("rechaza un archivo vacío", async () => {
    const f = await fixture();
    const result = await uploadCvAttachment(
      f.seller,
      { cvId: f.cv.id, kind: "OTRO", file: file("") },
      store,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
});
