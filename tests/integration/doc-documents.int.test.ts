// tests/integration/doc-documents.int.test.ts
// Documentos por fase contra la base (AGENTS.md §2.10, ADR-16): suben todos los usuarios con rol, la ruta es
// legible, un nombre repetido recibe sufijo sin pisar el archivo y una fase dada de baja no admite subidas.
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { uploadDocument } from "@/server/documentation/upload-document";
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
  root = await mkdtemp(join(tmpdir(), "kraken-docs-"));
  store = new LocalFileStore(root);
});
afterAll(async () => {
  await db.$disconnect();
  await rm(root, { recursive: true, force: true });
});

const file = (text: string, name = "acta.txt") =>
  new File([text], name, { type: "text/plain" });

async function fixture() {
  const engineer = await createUserWithRoles(db, "Ingeniera", [
    { code: "INGENIERO" },
  ]);
  const customer = await db.customer.create({
    data: { name: `Banco ${randomUUID().slice(-6)} S.A.` },
  });
  const phase = await db.docPhase.create({
    data: { name: `Diseño ${randomUUID()}`, order: 1 },
  });
  const project = (name: string) =>
    db.docProject.create({
      data: {
        name,
        customerId: customer.id,
        ownerId: engineer.id,
        createdById: engineer.id,
      },
    });
  return { engineer, customer, phase, project };
}

describe("documentos de un proyecto", () => {
  it("sube con hash a una ruta legible y un nombre repetido recibe sufijo", async () => {
    const f = await fixture();
    const project = await f.project("SD-WAN");
    const target = { projectId: project.id, phaseId: f.phase.id };

    const first = await uploadDocument(f.engineer, target, file("hola"), store);
    if (!first.ok) throw new Error(first.error.message);
    const row = await db.docDocument.findUniqueOrThrow({
      where: { id: first.data.documentId },
    });
    expect(row).toMatchObject({
      fileName: "acta.txt",
      sizeBytes: 4,
      sha256: createHash("sha256").update("hola").digest("hex"),
    });
    expect(row.storagePath).toBe(
      `documentacion/${f.customer.name.replace(/\.$/, "")}/SD-WAN/${f.phase.name}/acta.txt`,
    );

    const second = await uploadDocument(f.engineer, target, file("x"), store);
    expect(second.ok && second.data.fileName).toBe("acta (2).txt");
    expect(new TextDecoder().decode(await store.get(row.storagePath))).toBe(
      "hola",
    );
  });

  it("otro proyecto con el mismo nombre no pisa el archivo en la carpeta compartida", async () => {
    const f = await fixture();
    const a = await f.project("Mismo nombre");
    const b = await f.project("Mismo nombre");
    await uploadDocument(
      f.engineer,
      { projectId: a.id, phaseId: f.phase.id },
      file("a"),
      store,
    );
    const fromB = await uploadDocument(
      f.engineer,
      { projectId: b.id, phaseId: f.phase.id },
      file("b"),
      store,
    );
    expect(fromB.ok && fromB.data.fileName).toBe("acta (2).txt");
  });

  it("una fase dada de baja no admite documentos y un usuario sin roles no sube", async () => {
    const f = await fixture();
    const project = await f.project("Fase cerrada");
    const target = { projectId: project.id, phaseId: f.phase.id };
    const nobody = await createUserWithRoles(db, "Sin rol", []);
    const denied = await uploadDocument(nobody, target, file("x"), store);
    expect(denied.ok ? "OK" : denied.error.code).toBe("FORBIDDEN");

    await db.docPhase.update({
      where: { id: f.phase.id },
      data: { isActive: false },
    });
    const inactive = await uploadDocument(f.engineer, target, file("x"), store);
    expect(inactive.ok ? "OK" : inactive.error.code).toBe("INVALID_STATE");
    expect(await db.docDocument.count({ where: target })).toBe(0);
  });
});
