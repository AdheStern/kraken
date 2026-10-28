// src/server/tickets/notify-ticket-requester.ts
// Avisa a quien pidió un ticket cada cambio de estado del ticket que nació de su solicitud (AGENTS.md §2.6
// «Solicitudes de ticket»). El aviso de creación lo da el alta (prepare-request-link.ts).
import type { TicketStatus } from "@/domain/tickets/ticket-state-machine";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";

type Change = {
  ticketId: string;
  from: TicketStatus | null;
  to: TicketStatus;
  actorId: string;
};

const NEWS: Partial<Record<TicketStatus, string>> = {
  ASIGNADO: "ya tiene encargado",
  EN_PROGRESO: "lo están atendiendo",
  EN_ESPERA_CLIENTE: "espera tu respuesta",
  RESUELTO: "se resolvió",
  CERRADO: "se cerró",
  CANCELADO: "se canceló",
};

export async function notifyTicketRequester(
  tx: Tx,
  { ticketId, from, to, actorId }: Change,
): Promise<void> {
  const news = from === "CERRADO" ? "se reabrió" : NEWS[to];
  if (!news) return;
  // TRAMPA: en el alta la solicitud se enlaza después de los primeros estados; aquí aún no aparece y no se
  // duplica el aviso de creación.
  const request = await tx.ticketRequest.findUnique({
    where: { ticketId },
    select: {
      number: true,
      requesterId: true,
      ticket: { select: { number: true, title: true } },
    },
  });
  if (!request?.ticket || request.requesterId === actorId) return;
  await notify(tx, {
    event: "SOLICITUD_ESTADO",
    userIds: [request.requesterId],
    title: `Tu ticket #${request.ticket.number} ${news}`,
    body: `«${request.ticket.title}» (solicitud #${request.number}). Mira su estado en Mis solicitudes.`,
    link: "/solicitudes",
  });
}
