// src/server/sla/load-sla-input.ts
// Arma la entrada de computeSla de un ticket: historial de estados, primer comentario público del encargado,
// política vigente y calendario de su ciudad (AGENTS.md §2.7).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { SlaInput } from "@/domain/sla/compute-sla";
import { loadBusinessCalendar } from "@/server/calendar/load-business-calendar";
import type { Tx } from "@/server/db";

// LIMITACIÓN: el calendario se carga hasta 60 días adelante; un vencimiento posterior ignora feriados lejanos.
const HORIZON_MS = 60 * 86_400_000;

export type SlaContext = {
  input: SlaInput;
  policyId: string;
  ticket: {
    id: string;
    number: number;
    title: string;
    ownerId: string | null;
    areaIds: string[];
  };
};

export async function loadSlaInput(
  tx: Tx,
  ticketId: string,
  now: Date,
): Promise<SlaContext | null> {
  const ticket = await tx.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      areas: { select: { areaId: true } },
      statusEvents: {
        orderBy: { occurredAt: "asc" },
        select: { toStatus: true, occurredAt: true },
      },
    },
  });
  // REGLA: sin política activa para la modalidad y prioridad del ticket no se mide SLA (§2.7).
  const policy = await tx.slaPolicy.findFirst({
    where: {
      modality: ticket.slaModality,
      priority: ticket.priority,
      isActive: true,
    },
  });
  if (!policy || ticket.statusEvents.length === 0) return null;
  const comment = ticket.ownerId
    ? await tx.comment.findFirst({
        where: { ticketId, authorId: ticket.ownerId, isPublic: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      })
    : null;
  const calendar =
    ticket.slaModality === "H24X7"
      ? { slots: [], holidays: new Set<string>() }
      : await loadBusinessCalendar(tx, ticket.cityId, {
          from: toBusinessDate(ticket.createdAt),
          to: toBusinessDate(new Date(now.getTime() + HORIZON_MS)),
        });
  return {
    policyId: policy.id,
    ticket: {
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      ownerId: ticket.ownerId,
      areaIds: ticket.areas.map((a) => a.areaId),
    },
    input: {
      events: ticket.statusEvents.map((e) => ({
        to: e.toStatus,
        at: e.occurredAt,
      })),
      firstPublicCommentAt: comment?.createdAt ?? null,
      modality: ticket.slaModality,
      targets: policy,
      calendar,
      now,
    },
  };
}
