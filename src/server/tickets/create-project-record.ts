// src/server/tickets/create-project-record.ts
// Alta de un proyecto (contenedor con nombre, cliente, áreas y fechas) para agrupar tickets
// (AGENTS.md §2.6 estructura).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canCreateTicket } from "@/server/authz/ticket-permissions";
import type { Tx } from "@/server/db";

export type NewProject = {
  name: string;
  customerId: string;
  areaIds: string[];
  startsOn: string | null;
  endsOn: string | null;
};

const toDate = (date: string | null) =>
  date ? new Date(`${date}T00:00:00Z`) : null;

export async function createProjectRecord(
  tx: Tx,
  user: SessionUser,
  input: NewProject,
): Promise<ActionResult<{ projectId: string }>> {
  if (!canCreateTicket(user, { areaIds: input.areaIds }))
    return actionError(
      "FORBIDDEN",
      "Solo puedes crear proyectos de las áreas que coordinas o gerencias.",
    );
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn)
    return actionError(
      "VALIDATION",
      "La fecha de fin no puede ser anterior a la de inicio.",
    );
  const customer = await tx.customer.findFirst({
    where: { id: input.customerId, isActive: true },
    select: { id: true },
  });
  if (!customer)
    return actionError(
      "VALIDATION",
      "El cliente no existe o está dado de baja.",
    );
  const project = await tx.project.create({
    data: {
      name: input.name,
      customerId: input.customerId,
      startsOn: toDate(input.startsOn),
      endsOn: toDate(input.endsOn),
      createdById: user.id,
      areas: { create: input.areaIds.map((areaId) => ({ areaId })) },
    },
    select: { id: true },
  });
  return actionOk({ projectId: project.id });
}
