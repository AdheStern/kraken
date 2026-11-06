// src/server/tickets/notify-customer-activity.ts
// Avisa a DIMA cuando la cuenta de un cliente comenta, adjunta o responde su conformidad en su ticket (AGENTS.md
// §2.11): al encargado o, si el ticket aún no tiene, a los coordinadores de sus áreas.
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";

type Activity =
  | { kind: "COMENTARIO" }
  | { kind: "ADJUNTO"; fileName: string }
  | { kind: "CONFORME"; rating: number }
  | { kind: "NO_CONFORME" };

export async function notifyCustomerActivity(
  tx: Tx,
  user: SessionUser,
  ticketId: string,
  activity: Activity,
): Promise<void> {
  const ticket = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: {
      number: true,
      title: true,
      ownerId: true,
      areas: { select: { areaId: true } },
    },
  });
  if (!ticket) return;
  const userIds = ticket.ownerId
    ? [ticket.ownerId]
    : await coordinatorsOf(
        tx,
        ticket.areas.map((a) => a.areaId),
      );
  if (activity.kind === "CONFORME" || activity.kind === "NO_CONFORME") {
    const isSatisfied = activity.kind === "CONFORME";
    await notify(tx, {
      event: "TICKET_CONFORMIDAD",
      userIds,
      title: isSatisfied
        ? `El cliente quedó conforme con el ticket #${ticket.number} (${activity.rating} de 5)`
        : `El cliente no quedó conforme con el ticket #${ticket.number}`,
      body: isSatisfied
        ? `${user.name} calificó «${ticket.title}». Ya se puede cerrar.`
        : `${user.name} explicó por qué en un comentario público; el ticket volvió a En progreso.`,
      link: `/tickets/${ticketId}`,
    });
    return;
  }
  const what =
    activity.kind === "COMENTARIO"
      ? "comentó"
      : `adjuntó «${activity.fileName}»`;
  await notify(tx, {
    event: "TICKET_ACTIVIDAD_CLIENTE",
    userIds,
    title: `El cliente ${what} en el ticket #${ticket.number}`,
    body: `${user.name} ${what} en «${ticket.title}». Revísalo y respóndele con un comentario público.`,
    link: `/tickets/${ticketId}`,
  });
}

async function coordinatorsOf(tx: Tx, areaIds: string[]): Promise<string[]> {
  const roles = await tx.userRole.findMany({
    where: {
      role: { code: "COORDINADOR_SOPORTE" },
      areaId: { in: areaIds },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  return roles.map((r) => r.userId);
}
