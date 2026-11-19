// src/features/tickets/actions/import-historical-tickets.ts
// Carga de golpe el trabajo previo a Kraken: valida todas las filas y, si no hay errores, crea cada ticket en
// su propia transacción (un fallo no tumba a los demás) con su auditoría; sin avisos (AGENTS.md §2.6, ADR-14).
"use server";

import type { HistoricalIssue } from "@/domain/tickets/historical-row-parts";
import { parseHistoricalRows } from "@/domain/tickets/parse-historical-rows";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canCreateAnyTicket } from "@/server/authz/ticket-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  HistoricalImportRollback,
  type ImportedTicket,
  importHistoricalTicket,
} from "@/server/tickets/import-historical-ticket";
import {
  type ImportHistoricalInput,
  importHistoricalSchema,
  MAX_HISTORICAL_TICKETS,
} from "../schemas/historical-load-schemas";

export type HistoricalResult = { rows: number[] } & (
  | ImportedTicket
  | { outcome: "ERROR"; message: string }
);

export async function importHistoricalTickets(
  input: ImportHistoricalInput,
): Promise<
  ActionResult<{ issues: HistoricalIssue[]; results: HistoricalResult[] }>
> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canCreateAnyTicket(user))
    return actionError(
      "FORBIDDEN",
      "Solo quienes crean tickets pueden cargar trabajo previo.",
    );
  const parsed = importHistoricalSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { tickets, issues } = parseHistoricalRows(parsed.data.rows, new Date());
  if (issues.length > 0) return actionOk({ issues, results: [] });
  if (tickets.length > MAX_HISTORICAL_TICKETS)
    return actionError(
      "VALIDATION",
      `Carga hasta ${MAX_HISTORICAL_TICKETS} tickets por vez.`,
    );
  const results: HistoricalResult[] = [];
  // TRAMPA: en serie; los tramos de una misma persona en tickets distintos se revalidan contra lo ya creado.
  for (const ticket of tickets) {
    const result = await importOne(user, ticket);
    results.push(
      result.ok
        ? { rows: ticket.rows, ...result.data }
        : {
            rows: ticket.rows,
            outcome: "ERROR",
            message: result.error.message,
          },
    );
  }
  return actionOk({ issues: [], results });
}

async function importOne(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  ticket: Parameters<typeof importHistoricalTicket>[2],
): Promise<ActionResult<ImportedTicket>> {
  try {
    return await runInTransaction(async (tx) => {
      const result = await importHistoricalTicket(tx, user, ticket);
      if (result.ok && result.data.outcome === "CREADO")
        await recordAudit(tx, {
          actorId: user.id,
          entity: "tickets.ticket",
          entityId: result.data.ticketId,
          action: "CARGA_HISTORICA",
          after: {
            ...result.data,
            ref: ticket.ref,
            status: ticket.status,
            openedAt: ticket.openedAt.toISOString(),
            resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
            intervals: ticket.intervals.length,
          },
        });
      return result;
    });
  } catch (error) {
    if (error instanceof HistoricalImportRollback) return error.result;
    return toActionError(error, "importHistoricalTickets");
  }
}
