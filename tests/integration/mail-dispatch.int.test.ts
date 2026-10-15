// tests/integration/mail-dispatch.int.test.ts
// Envío del outbox (ADR-08, AGENTS.md §7 mail.dispatch): envía, reintenta lo pasajero, abandona lo permanente
// avisando al administrador, y dos despachos a la vez nunca envían el mismo correo.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { dispatchOutbox } from "@/server/mail/dispatch-outbox";
import {
  type MailMessage,
  MailSendError,
  type MailSender,
} from "@/server/mail/mail-sender";
import { createTestPrisma, createUserWithRoles } from "./test-db";

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const NOW = new Date("2030-01-01T12:00:00Z");
const clock = { now: () => NOW };

class FakeSender implements MailSender {
  readonly name = "fake";
  readonly sent: MailMessage[] = [];
  async send(message: MailMessage) {
    if (message.to.startsWith("lento"))
      throw new MailSendError("Graph respondió 503", true);
    if (message.to.startsWith("malo"))
      throw new MailSendError("Graph respondió 400", false);
    await new Promise((r) => setTimeout(r, 5));
    this.sent.push(message);
  }
}

async function queue(to: string, attempts = 0) {
  return db.outboxMessage.create({
    data: {
      eventType: "SISTEMA_CORREO_PRUEBA",
      recipientEmail: `${to}-${randomUUID().slice(0, 6)}@dima.test`,
      subject: "Prueba",
      bodyHtml: "<p>Hola</p>",
      attempts,
      // POR QUÉ: la base es compartida; una fecha vieja pone estos correos primero en el lote de 50.
      nextAttemptAt: new Date("2000-01-01T00:00:00Z"),
    },
  });
}

const reload = (id: string) =>
  db.outboxMessage.findUniqueOrThrow({ where: { id } });

describe("dispatchOutbox", () => {
  it("envía, reintenta lo pasajero y abandona lo permanente avisando al administrador", async () => {
    const admin = await createUserWithRoles(db, "Admin", [
      { code: "ADMIN_SISTEMA" },
    ]);
    const [ok, slow, bad, tired] = await Promise.all([
      queue("ok"),
      queue("lento"),
      queue("malo"),
      queue("lento", 9),
    ]);
    const sender = new FakeSender();
    await dispatchOutbox(db, sender, clock);

    expect((await reload(ok.id)).status).toBe("ENVIADO");
    const retried = await reload(slow.id);
    expect(retried).toMatchObject({ status: "PENDIENTE", attempts: 1 });
    expect(retried.nextAttemptAt.getTime()).toBe(NOW.getTime() + 60_000);
    expect((await reload(bad.id)).status).toBe("FALLIDO");
    expect(await reload(tired.id)).toMatchObject({
      status: "FALLIDO",
      attempts: 10,
    });
    const alerts = await db.inboxItem.count({
      where: { userId: admin.id, eventType: "SISTEMA_CORREO_FALLIDO" },
    });
    expect(alerts).toBe(2);
  });

  it("dos despachos a la vez no envían dos veces el mismo correo", async () => {
    const queued = await Promise.all(
      Array.from({ length: 12 }, () => queue("ok")),
    );
    const sender = new FakeSender();
    await Promise.all([
      dispatchOutbox(db, sender, clock),
      dispatchOutbox(db, sender, clock),
    ]);
    const mine = new Set(queued.map((m) => m.recipientEmail));
    const sentMine = sender.sent.filter((m) => mine.has(m.to));
    expect(sentMine).toHaveLength(12);
    expect(new Set(sentMine.map((m) => m.to)).size).toBe(12);
  });
});
