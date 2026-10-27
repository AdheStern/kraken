// tests/integration/doc-lessons.int.test.ts
// Lecciones aprendidas contra la base (AGENTS.md §2.10, ADR-16): se guardan como .txt en la carpeta de la fase,
// las edita cualquier usuario con rol sin pisar la edición de otro, y una fase dada de baja ya no las admite.
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDocLesson } from "@/server/documentation/create-doc-lesson";
import { updateDocLesson } from "@/server/documentation/update-doc-lesson";
import { LocalFileStore } from "@/server/files/local-file-store";
import { createTestPrisma, createUserWithRoles } from "./test-db";

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
  root = await mkdtemp(join(tmpdir(), "kraken-lessons-"));
  store = new LocalFileStore(root);
});
afterAll(async () => {
  await db.$disconnect();
  await rm(root, { recursive: true, force: true });
});

const MARKDOWN = "# Qué pasó\n\n- **UPS** sin carga";

const text = async (storagePath: string) =>
  new TextDecoder().decode(await store.get(storagePath));

async function fixture() {
  const engineer = await createUserWithRoles(db, "Ingeniera", [
    { code: "INGENIERO" },
  ]);
  const commercial = await createUserWithRoles(db, "Comercial", [
    { code: "COMERCIAL" },
  ]);
  const customer = await db.customer.create({
    data: { name: `Banco ${randomUUID().slice(-6)}` },
  });
  const phase = await db.docPhase.create({
    data: { name: `Cierre ${randomUUID()}`, order: 1 },
  });
  const project = await db.docProject.create({
    data: {
      name: "Data center",
      customerId: customer.id,
      ownerId: engineer.id,
      createdById: engineer.id,
    },
  });
  const lesson = (title: string) =>
    createDocLesson(
      engineer,
      { projectId: project.id, phaseId: phase.id, title, markdown: MARKDOWN },
      store,
    );
  return { engineer, commercial, phase, lesson };
}

describe("lecciones aprendidas", () => {
  it("se guarda como .txt con prefijo en la carpeta de la fase y un título repetido recibe sufijo", async () => {
    const f = await fixture();
    const created = await f.lesson("Corte de energía");
    if (!created.ok) throw new Error(created.error.message);
    const row = await db.docDocument.findUniqueOrThrow({
      where: { id: created.data.documentId },
    });
    expect(row).toMatchObject({
      kind: "LECCION",
      title: "Corte de energía",
      fileName: "Lección aprendida - Corte de energía.txt",
      mimeType: "text/plain",
    });
    expect(
      row.storagePath.endsWith(
        `/${f.phase.name}/Lección aprendida - Corte de energía.txt`,
      ),
    ).toBe(true);
    expect(await text(row.storagePath)).toBe(MARKDOWN);

    const again = await f.lesson("Corte de energía");
    expect(again.ok && again.data.fileName).toBe(
      "Lección aprendida - Corte de energía (2).txt",
    );
  });

  it("otro usuario con rol la edita en el mismo archivo; una versión vieja no pisa la edición", async () => {
    const f = await fixture();
    const created = await f.lesson("Licencias");
    if (!created.ok) throw new Error(created.error.message);
    const before = await db.docDocument.findUniqueOrThrow({
      where: { id: created.data.documentId },
    });
    const edit = (markdown: string) =>
      updateDocLesson(
        f.commercial,
        { documentId: before.id, baseVersion: before.sha256, markdown },
        store,
      );

    const saved = await edit("Pedir las licencias **antes**.");
    if (!saved.ok) throw new Error(saved.error.message);
    const after = await db.docDocument.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after).toMatchObject({
      storagePath: before.storagePath,
      sha256: saved.data.version,
      updatedById: f.commercial.id,
    });
    const bytes = await store.get(after.storagePath);
    expect(after.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    expect(await text(after.storagePath)).toBe(
      "Pedir las licencias **antes**.",
    );

    const stale = await edit("Otra versión");
    expect(stale.ok ? "OK" : stale.error.code).toBe("CONFLICT");
    expect(await text(after.storagePath)).toBe(
      "Pedir las licencias **antes**.",
    );
  });

  it("una fase dada de baja no admite lecciones nuevas ni ediciones, y sin roles no se edita", async () => {
    const f = await fixture();
    const created = await f.lesson("Fase cerrada");
    if (!created.ok) throw new Error(created.error.message);
    const row = await db.docDocument.findUniqueOrThrow({
      where: { id: created.data.documentId },
    });
    const input = {
      documentId: row.id,
      baseVersion: row.sha256,
      markdown: "x",
    };
    const nobody = await createUserWithRoles(db, "Sin rol", []);
    const denied = await updateDocLesson(nobody, input, store);
    expect(denied.ok ? "OK" : denied.error.code).toBe("FORBIDDEN");

    await db.docPhase.update({
      where: { id: f.phase.id },
      data: { isActive: false },
    });
    const edited = await updateDocLesson(f.engineer, input, store);
    expect(edited.ok ? "OK" : edited.error.code).toBe("INVALID_STATE");
    const added = await f.lesson("Otra");
    expect(added.ok ? "OK" : added.error.code).toBe("INVALID_STATE");
  });

  it("la base exige título en una lección y lo rechaza en un archivo", async () => {
    const f = await fixture();
    const created = await f.lesson("Con título");
    if (!created.ok) throw new Error(created.error.message);
    const id = created.data.documentId;
    await expect(
      db.docDocument.update({ where: { id }, data: { title: null } }),
    ).rejects.toThrow(/documento_titulo_ck/);
    await expect(
      db.docDocument.update({ where: { id }, data: { kind: "ARCHIVO" } }),
    ).rejects.toThrow(/documento_titulo_ck/);
  });
});
