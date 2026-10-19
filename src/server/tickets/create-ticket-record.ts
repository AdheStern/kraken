// src/server/tickets/create-ticket-record.ts
// Alta de un ticket con sus áreas y su primer evento de estado; con encargado nace ASIGNADO (AGENTS.md §2.6).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { isTicketEngineer } from "./load-ticket-access";
import { notifyOwnerAssigned } from "./notify-owner-assigned";

export type NewTicket = {
  kind: "SOPORTE" | "PROYECTO";
  customerId: string;
  cityId: string;
  areaIds: string[];
  projectId: string | null;
  priority: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
  slaModality: "H8X5" | "H24X7";
  title: string;
  description: string;
  ownerId: string | null;
};

export async function createTicketRecord(
  tx: Tx,
  user: SessionUser,
  input: NewTicket,
  now: Date,
): Promise<ActionResult<{ ticketId: string; number: number }>> {
  if (!canCreateTicket(user, { areaIds: input.areaIds }))
    return actionError(
      "FORBIDDEN",
      "Solo puedes crear tickets de las áreas que coordinas o gerencias.",
    );
  const issue = await validateReferences(tx, input);
  if (issue) return actionError("VALIDATION", issue);

  const ticket = await tx.ticket.create({
    data: {
      kind: input.projectId ? "PROYECTO" : input.kind,
      customerId: input.customerId,
      cityId: input.cityId,
      projectId: input.projectId,
      priority: input.priority,
      slaModality: input.slaModality,
      title: input.title,
      description: input.description,
      createdById: user.id,
      createdAt: now,
      areas: { create: input.areaIds.map((areaId) => ({ areaId })) },
    },
    select: { id: true, number: true },
  });
  await applyStatusChange(tx, {
    ticketId: ticket.id,
    from: null,
    to: "NUEVO",
    actorId: user.id,
    now,
  });
  if (input.ownerId) {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { ownerId: input.ownerId },
    });
    await applyStatusChange(tx, {
      ticketId: ticket.id,
      from: "NUEVO",
      to: "ASIGNADO",
      actorId: user.id,
      now,
    });
    await notifyOwnerAssigned(tx, ticket, input.title, input.ownerId, user);
  }
  return actionOk({ ticketId: ticket.id, number: ticket.number });
}

async function validateReferences(
  tx: Tx,
  input: NewTicket,
): Promise<string | null> {
  const customer = await tx.customer.findFirst({
    where: { id: input.customerId, isActive: true },
    select: { id: true },
  });
  if (!customer) return "El cliente no existe o está dado de baja.";
  const areas = await tx.area.count({
    where: { id: { in: input.areaIds }, isActive: true },
  });
  if (areas !== new Set(input.areaIds).size)
    return "Una de las áreas no existe o está dada de baja.";
  if (input.projectId) {
    const project = await tx.project.findFirst({
      where: { id: input.projectId, customerId: input.customerId },
      select: { status: true },
    });
    if (project?.status !== "ACTIVO")
      return "El proyecto no es de este cliente o ya está cerrado.";
  }
  if (
    input.ownerId &&
    !(await isTicketEngineer(tx, input.ownerId, input.areaIds))
  )
    return "El encargado debe ser un ingeniero de un área del ticket.";
  return null;
}
