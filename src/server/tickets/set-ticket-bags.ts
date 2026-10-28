// src/server/tickets/set-ticket-bags.ts
// Define la jerarquía ordenada de bolsas de un ticket (prioridad 1, 2, 3…) que llena el cierre; el SLA toma la
// modalidad de la prioridad 1 (AGENTS.md §2.6 estructura y paso 2, §2.7).
import { bagIneligibility } from "@/domain/tickets/bag-eligibility";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canManageTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { loadTicketAccess } from "./load-ticket-access";
import { lockTicket } from "./lock-ticket";

// POR QUÉ: ticket_bolsa es único por (ticket, prioridad); se corren las filas que quedan antes de reordenar.
const PRIORITY_OFFSET = 1000;

export async function setTicketBagsRecord(
  tx: Tx,
  user: SessionUser,
  { ticketId, bagIds }: { ticketId: string; bagIds: string[] },
): Promise<ActionResult<{ bagIds: string[] }>> {
  const ticket = await lockTicket(tx, ticketId);
  const access = await loadTicketAccess(tx, ticketId);
  if (!ticket || !access)
    return actionError("NOT_FOUND", "El ticket ya no existe.");
  if (!canManageTicket(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el encargado, el coordinador o el gerente del área ordenan las bolsas.",
    );
  if (ticket.status === "CERRADO" || ticket.status === "CANCELADO")
    return actionError(
      "INVALID_STATE",
      "El ticket ya terminó. Reábrelo para cambiar sus bolsas.",
    );
  const issue = await checkBags(tx, bagIds, {
    customerId: ticket.customerId,
    areaIds: access.areaIds,
    projectId: ticket.projectId,
  });
  if (issue) return actionError("VALIDATION", issue);
  await reorder(tx, ticketId, bagIds);
  if (bagIds.length > 0) await syncSlaModality(tx, ticketId, bagIds[0]);
  return actionOk({ bagIds });
}

async function checkBags(
  tx: Tx,
  bagIds: readonly string[],
  ticket: {
    customerId: string;
    areaIds: readonly string[];
    projectId: string | null;
  },
): Promise<string | null> {
  const bags = await tx.hourBag.findMany({
    where: { id: { in: [...bagIds] } },
    select: {
      id: true,
      customerId: true,
      status: true,
      scope: true,
      projectId: true,
      areas: { select: { areaId: true } },
    },
  });
  if (bags.length !== bagIds.length) return "Una de las bolsas ya no existe.";
  for (const bag of bags) {
    const reason = bagIneligibility(
      { ...bag, areaIds: bag.areas.map((a) => a.areaId) },
      ticket,
    );
    if (reason) return reason;
  }
  return null;
}

// REGLA: el SLA corre con la modalidad que se vendió en la bolsa de prioridad 1 (§2.7); sin bolsas, conserva la última.
async function syncSlaModality(tx: Tx, ticketId: string, bagId: string) {
  const bag = await tx.hourBag.findUniqueOrThrow({
    where: { id: bagId },
    select: { modality: true },
  });
  await tx.ticket.update({
    where: { id: ticketId },
    data: { slaModality: bag.modality },
  });
}

// POR QUÉ: se actualizan las filas que quedan en lugar de borrarlas para conservar su marca de aviso.
async function reorder(tx: Tx, ticketId: string, bagIds: readonly string[]) {
  await tx.ticketBag.deleteMany({
    where: { ticketId, bagId: { notIn: [...bagIds] } },
  });
  await tx.ticketBag.updateMany({
    where: { ticketId },
    data: { priority: { increment: PRIORITY_OFFSET } },
  });
  for (const [index, bagId] of bagIds.entries())
    await tx.ticketBag.upsert({
      where: { ticketId_bagId: { ticketId, bagId } },
      create: { ticketId, bagId, priority: index + 1 },
      update: { priority: index + 1 },
    });
}
