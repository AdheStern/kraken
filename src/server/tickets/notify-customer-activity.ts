// src/server/tickets/notify-customer-activity.ts
// Avisa a DIMA cuando la cuenta de un cliente comenta o adjunta en su ticket (AGENTS.md §2.11): al encargado o,
// si el ticket aún no tiene, a los coordinadores de sus áreas.
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";

type Activity = { kind: "COMENTARIO" } | { kind: "ADJUNTO"; fileName: string };

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
