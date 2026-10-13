// src/server/notifications/notify.ts
// Notifica un evento a un grupo de usuarios: bandeja de la app y correo en el outbox, dentro de la
// transacción de la action (ADR-08). El worker mail.dispatch envía la salida; aquí no se envía nada.
import type { Tx } from "@/server/db";
import type { NotificationEvent } from "./events";

type Notice = {
  event: NotificationEvent;
  userIds: readonly string[];
  title: string;
  body: string;
  link: string;
};

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export async function notify(tx: Tx, notice: Notice): Promise<void> {
  const userIds = [...new Set(notice.userIds)];
  if (userIds.length === 0) return;
  const users = await tx.user.findMany({
    where: { id: { in: userIds }, profile: { isActive: true } },
    select: { id: true, email: true },
  });
  await tx.inboxItem.createMany({
    data: users.map((user) => ({
      userId: user.id,
      eventType: notice.event,
      title: notice.title,
      body: notice.body,
      link: notice.link,
    })),
  });
  await tx.outboxMessage.createMany({
    data: users.map((user) => ({
      eventType: notice.event,
      recipientEmail: user.email,
      subject: `Kraken · ${notice.title}`,
      bodyHtml: toEmailHtml(notice),
    })),
  });
}

function toEmailHtml({ title, body, link }: Notice): string {
  const href = new URL(link, APP_URL).toString();
  return [
    `<h2 style="font-family:Arial,sans-serif;color:#00469D">${escapeHtml(title)}</h2>`,
    `<p style="font-family:Arial,sans-serif">${escapeHtml(body)}</p>`,
    `<p><a href="${escapeHtml(href)}" style="font-family:Arial,sans-serif">Abrir en Kraken</a></p>`,
  ].join("");
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
