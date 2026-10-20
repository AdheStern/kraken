// tests/integration/ticket-attachments.int.test.ts
// Adjuntos de ticket contra la base (ADR-16, AGENTS.md §2.9): suben quienes trabajan el ticket con su hash, el
// comercial no; quitar borra el registro y el archivo; un ticket cerrado conserva sus adjuntos.
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LocalFileStore } from "@/server/files/local-file-store";
import { deleteTicketAttachmentRecord } from "@/server/tickets/delete-ticket-attachment-record";
import { uploadTicketAttachment } from "@/server/tickets/upload-ticket-attachment";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { createTicketFixture } from "./ticket-fixtures";

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
  root = await mkdtemp(join(tmpdir(), "kraken-attach-"));
  store = new LocalFileStore(root);
});
afterAll(async () => {
  await db.$disconnect();
  await rm(root, { recursive: true, force: true });
});

const file = (text: string) =>
  new File([text], "acta/../acta: final.txt", { type: "text/plain" });

describe("adjuntos del ticket", () => {
  it("el encargado sube con hash y nombre seguro; el comercial no; quitar borra registro y archivo", async () => {
    const f = await createTicketFixture(db, []);
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    const commercial = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { ownerId: engineer.id, status: "EN_PROGRESO" },
    });

    const denied = await uploadTicketAttachment(
      commercial,
      f.ticket.id,
      file("x"),
      store,
    );
    expect(denied.ok ? "OK" : denied.error.code).toBe("FORBIDDEN");

    const uploaded = await uploadTicketAttachment(
      engineer,
      f.ticket.id,
      file("hola"),
      store,
    );
    if (!uploaded.ok) throw new Error(uploaded.error.message);
    const row = await db.ticketAttachment.findUniqueOrThrow({
      where: { id: uploaded.data.attachmentId },
    });
    expect(row).toMatchObject({
      fileName: "acta_ final.txt",
      sizeBytes: 4,
      sha256: createHash("sha256").update("hola").digest("hex"),
    });
    expect(new TextDecoder().decode(await store.get(row.storagePath))).toBe(
      "hola",
    );

    const deleted = await db.$transaction((tx) =>
      deleteTicketAttachmentRecord(tx, engineer, { attachmentId: row.id }),
    );
    expect(deleted.ok).toBe(true);
    expect(await db.ticketAttachment.count({ where: { id: row.id } })).toBe(0);
  });

  it("un ticket cerrado conserva sus adjuntos", async () => {
    const f = await createTicketFixture(db, []);
    const uploaded = await uploadTicketAttachment(
      f.coordinator,
      f.ticket.id,
      file("x"),
      store,
    );
    if (!uploaded.ok) throw new Error(uploaded.error.message);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { status: "CERRADO" },
    });
    const deleted = await db.$transaction((tx) =>
      deleteTicketAttachmentRecord(tx, f.coordinator, {
        attachmentId: uploaded.data.attachmentId,
      }),
    );
    expect(deleted.ok ? "OK" : deleted.error.code).toBe("INVALID_STATE");
  });
});
