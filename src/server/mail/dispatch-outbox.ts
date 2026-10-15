// src/server/mail/dispatch-outbox.ts
// Envía los correos pendientes de notif.salida (outbox, ADR-08): toma un lote sin pisarse con el otro worker,
// lo envía fuera de la transacción y marca enviado, reintento o fallido (AGENTS.md §7 mail.dispatch).
import type { Clock } from "@/domain/clock";
import {
  computeNextAttempt,
  shouldGiveUp,
} from "@/domain/notifications/next-attempt";
import type { prisma } from "@/server/db";
import { log } from "@/server/log";
import { MailSendError, type MailSender } from "./mail-sender";

type Db = typeof prisma;
type Claimed = {
  id: string;
  destinatario: string;
  asunto: string;
  cuerpo_html: string;
  intentos: number;
};

export type DispatchResult = { sent: number; retried: number; failed: number };

const BATCH = 50;
const LEASE_MS = 5 * 60_000;

export async function dispatchOutbox(
  db: Db,
  sender: MailSender,
  clock: Clock,
): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, retried: 0, failed: 0 };
  for (const message of await claimBatch(db, clock.now())) {
    const outcome = await deliver(db, sender, clock, message);
    result[outcome]++;
  }
  return result;
}

// POR QUÉ: SKIP LOCKED + "arriendo" de 5 min: dos workers nunca toman el mismo correo, y si uno muere a mitad
// del envío el correo vuelve a estar disponible al vencer el arriendo.
async function claimBatch(db: Db, now: Date): Promise<Claimed[]> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Claimed[]>`
      SELECT id, destinatario, asunto, cuerpo_html, intentos FROM notif.salida
      WHERE estado = 'PENDIENTE' AND proximo_intento_en <= ${now}
      ORDER BY proximo_intento_en LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED`;
    if (rows.length > 0)
      await tx.outboxMessage.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { nextAttemptAt: new Date(now.getTime() + LEASE_MS) },
      });
    return rows;
  });
}

async function deliver(
  db: Db,
  sender: MailSender,
  clock: Clock,
  message: Claimed,
): Promise<keyof DispatchResult> {
  const attempts = message.intentos + 1;
  try {
    await sender.send({
      to: message.destinatario,
      subject: message.asunto,
      html: message.cuerpo_html,
    });
    await db.outboxMessage.update({
      where: { id: message.id },
      data: {
        status: "ENVIADO",
        sentAt: clock.now(),
        attempts,
        lastError: null,
      },
    });
    return "sent";
  } catch (error) {
    const transient = !(error instanceof MailSendError) || error.isTransient;
    const lastError = error instanceof Error ? error.message : String(error);
    if (transient && !shouldGiveUp(attempts)) {
      await db.outboxMessage.update({
        where: { id: message.id },
        data: {
          attempts,
          lastError,
          nextAttemptAt: computeNextAttempt(clock.now(), attempts),
        },
      });
      return "retried";
    }
    await giveUp(db, message, attempts, lastError);
    return "failed";
  }
}

// REGLA: tras 10 fallos (o uno permanente) se avisa al administrador por la bandeja; por correo no, porque
// es justo lo que está fallando (AGENTS.md §7 mail.dispatch).
async function giveUp(
  db: Db,
  message: Claimed,
  attempts: number,
  lastError: string,
) {
  log("error", "correo abandonado", {
    outboxId: message.id,
    attempts,
    lastError,
  });
  const admins = await db.userRole.findMany({
    where: { role: { code: "ADMIN_SISTEMA" }, user: { isActive: true } },
    select: { userId: true },
    distinct: ["userId"],
  });
  await db.$transaction([
    db.outboxMessage.update({
      where: { id: message.id },
      data: { status: "FALLIDO", attempts, lastError },
    }),
    db.inboxItem.createMany({
      data: admins.map(({ userId }) => ({
        userId,
        eventType: "SISTEMA_CORREO_FALLIDO",
        title: "Un correo no se pudo enviar",
        body: `Para ${message.destinatario}: «${message.asunto}». ${lastError}`,
        link: "/admin/correo",
      })),
    }),
  ]);
}
