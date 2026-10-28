// src/server/tickets/create-ticket-record.ts
// Alta de un ticket con sus áreas, su primer evento de estado y, si se elige, su primera bolsa (de la que toma la
// modalidad del SLA); con encargado nace ASIGNADO (AGENTS.md §2.6, §2.7).
import { bagIneligibility } from "@/domain/tickets/bag-eligibility";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";
import { applyStatusChange } from "./apply-status-change";
import { isTicketEngineer } from "./load-ticket-access";
import { notifyOwnerAssigned } from "./notify-owner-assigned";

type Modality = "H8X5" | "H24X7";

export type NewTicket = {
  kind: "SOPORTE" | "PROYECTO";
  customerId: string;
  cityId: string;
  areaIds: string[];
  projectId: string | null;
  bagId: string | null;
  priority: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
  slaModality: Modality;
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
  const bag = await loadInitialBag(tx, user, input);
  if (typeof bag === "string") return actionError("VALIDATION", bag);

  const ticket = await tx.ticket.create({
    data: {
      kind: input.projectId ? "PROYECTO" : input.kind,
      customerId: input.customerId,
      cityId: input.cityId,
      projectId: input.projectId,
      priority: input.priority,
      // REGLA: con bolsa, el SLA corre con la modalidad que se vendió (§2.7).
      slaModality: bag?.modality ?? input.slaModality,
      title: input.title,
      description: input.description,
      createdById: user.id,
      createdAt: now,
      areas: { create: input.areaIds.map((areaId) => ({ areaId })) },
      ...(bag && { bags: { create: { bagId: bag.id, priority: 1 } } }),
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
  if (input.ownerId)
    await assignInitialOwner(tx, user, ticket, input.ownerId, input.title, now);
  return actionOk({ ticketId: ticket.id, number: ticket.number });
}

async function assignInitialOwner(
  tx: Tx,
  user: SessionUser,
  ticket: { id: string; number: number },
  ownerId: string,
  title: string,
  now: Date,
) {
  await tx.ticket.update({ where: { id: ticket.id }, data: { ownerId } });
  await applyStatusChange(tx, {
    ticketId: ticket.id,
    from: "NUEVO",
    to: "ASIGNADO",
    actorId: user.id,
    now,
  });
  await notifyOwnerAssigned(tx, ticket, title, ownerId, user);
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

type InitialBag = { id: string; modality: Modality } | null;

// POR QUÉ: devuelve el motivo del rechazo en lugar de lanzar, para validar antes de escribir nada.
async function loadInitialBag(
  tx: Tx,
  user: SessionUser,
  input: NewTicket,
): Promise<InitialBag | string> {
  if (!input.bagId) return null;
  const bag = await tx.hourBag.findFirst({
    where: { AND: [{ id: input.bagId }, scopeHourBagQuery(user)] },
    select: {
      id: true,
      customerId: true,
      status: true,
      scope: true,
      projectId: true,
      modality: true,
      areas: { select: { areaId: true } },
    },
  });
  if (!bag) return "La bolsa no existe o no la puedes ver.";
  return (
    bagIneligibility(
      { ...bag, areaIds: bag.areas.map((a) => a.areaId) },
      input,
    ) ?? bag
  );
}
