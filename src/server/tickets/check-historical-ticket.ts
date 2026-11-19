// src/server/tickets/check-historical-ticket.ts
// Revisa un ticket de la carga histórica antes de escribir nada: permisos para crearlo y cerrarlo, catálogos,
// bolsa, ejecutores de las áreas, solapes con registros ya guardados y horario de su ciudad (AGENTS.md §2.6).
import type { HistoricalTicket } from "@/domain/tickets/parse-historical-rows";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import {
  canCloseTicket,
  canCreateTicket,
} from "@/server/authz/ticket-permissions";
import { findCityWithoutOfficeHours } from "@/server/calendar/find-city-without-office-hours";
import type { Tx } from "@/server/db";
import {
  loadInitialBag,
  type NewTicket,
  validateReferences,
} from "./create-ticket-record";
import { isTicketEngineer } from "./load-ticket-access";

export type CheckedHistoricalTicket = {
  input: NewTicket;
  bag: { id: string; modality: "H8X5" | "H24X7" } | null;
};

export async function checkHistoricalTicket(
  tx: Tx,
  user: SessionUser,
  ticket: HistoricalTicket,
): Promise<ActionResult<CheckedHistoricalTicket>> {
  const areas = { areaIds: ticket.areaIds };
  if (!canCreateTicket(user, areas))
    return actionError(
      "FORBIDDEN",
      "Solo puedes cargar tickets de las áreas que coordinas o gerencias.",
    );
  if (ticket.status === "CERRADO" && !canCloseTicket(user, areas))
    return actionError("FORBIDDEN", "No puedes cerrar tickets de estas áreas.");
  const input: NewTicket = {
    kind: ticket.projectId ? "PROYECTO" : "SOPORTE",
    customerId: ticket.customerId,
    cityId: ticket.cityId,
    areaIds: ticket.areaIds,
    projectId: ticket.projectId,
    bagId: ticket.bagId,
    priority: ticket.priority,
    slaModality: "H8X5",
    title: ticket.title,
    description: ticket.description,
    ownerId: ticket.ownerId,
  };
  const issue = await validateReferences(tx, input);
  if (issue) return actionError("VALIDATION", issue);
  const bag = await loadInitialBag(tx, user, input);
  if (typeof bag === "string") return actionError("VALIDATION", bag);
  const problem =
    (await checkExecutors(tx, ticket)) ??
    (await checkOverlaps(tx, ticket)) ??
    (await checkCity(tx, ticket));
  return problem
    ? actionError("VALIDATION", problem)
    : actionOk({ input, bag });
}

async function checkExecutors(
  tx: Tx,
  ticket: HistoricalTicket,
): Promise<string | null> {
  const executors = new Set(ticket.intervals.map((i) => i.executorId));
  for (const executorId of executors)
    if (!(await isTicketEngineer(tx, executorId, ticket.areaIds)))
      return "Quien ejecuta un tramo debe ser un ingeniero de un área del ticket.";
  return null;
}

// REGLA: los registros de una misma persona no se solapan (§2.6); la exclusión de la base es la última red.
async function checkOverlaps(
  tx: Tx,
  ticket: HistoricalTicket,
): Promise<string | null> {
  for (const interval of ticket.intervals) {
    const overlap = await tx.timeEntry.findFirst({
      where: {
        userId: interval.executorId,
        startedAt: { lt: interval.end },
        OR: [{ endedAt: null }, { endedAt: { gt: interval.start } }],
      },
      select: { ticket: { select: { number: true } } },
    });
    if (overlap)
      return `Un tramo se solapa con otro registro de la misma persona en el ticket #${overlap.ticket.number}.`;
  }
  return null;
}

async function checkCity(
  tx: Tx,
  ticket: HistoricalTicket,
): Promise<string | null> {
  if (ticket.status !== "CERRADO") return null;
  const cityName = await findCityWithoutOfficeHours(tx, ticket.cityId);
  return cityName
    ? `${cityName} no tiene horario de oficina, así que no se pueden ponderar sus horas. Pide al administrador que se lo asigne o carga el ticket como resuelto.`
    : null;
}
