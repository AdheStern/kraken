// src/server/tickets/add-manual-time-entry-record.ts
// Registro manual de tiempo (inicio y fin): sin solapes con otros registros propios y marcado tardío si se
// carga más de 48 h después de su fin (AGENTS.md §2.6 registro de tiempo).
import {
  isLateEntry,
  manualEntryIssue,
} from "@/domain/tickets/time-entry-rules";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { lockUserTimers, prepareTimeLogging } from "./prepare-time-logging";

type ManualEntry = {
  ticketId: string;
  subtaskId: string | null;
  startedAt: Date;
  endedAt: Date;
};

export async function addManualTimeEntryRecord(
  tx: Tx,
  user: SessionUser,
  entry: ManualEntry,
  now: Date,
): Promise<ActionResult<{ entryId: string; isLate: boolean }>> {
  const prepared = await prepareTimeLogging(tx, user, entry, "MANUAL");
  if (!prepared.ok) return prepared;
  const issue = manualEntryIssue(entry.startedAt, entry.endedAt, now);
  if (issue) return actionError("VALIDATION", issue);
  await lockUserTimers(tx, user.id);
  // REGLA: los registros de una misma persona no se solapan (§2.6); la exclusión de la base es la última red.
  const overlap = await tx.timeEntry.findFirst({
    where: {
      userId: user.id,
      startedAt: { lt: entry.endedAt },
      OR: [{ endedAt: null }, { endedAt: { gt: entry.startedAt } }],
    },
    select: { ticket: { select: { number: true } } },
  });
  if (overlap)
    return actionError(
      "VALIDATION",
      `Se solapa con otro registro tuyo en el ticket #${overlap.ticket.number}. Revisa las horas.`,
    );
  const isLate = isLateEntry(entry.endedAt, now);
  const created = await tx.timeEntry.create({
    data: { ...entry, userId: user.id, source: "MANUAL", isLate },
    select: { id: true },
  });
  return actionOk({ entryId: created.id, isLate });
}
