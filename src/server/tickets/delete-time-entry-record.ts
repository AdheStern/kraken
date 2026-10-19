// src/server/tickets/delete-time-entry-record.ts
// Borra un registro manual propio mientras el ticket no haya terminado; los del contador no se borran
// (AGENTS.md §2.6: corregir = registro nuevo).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { lockTicket } from "./lock-ticket";

export async function deleteTimeEntryRecord(
  tx: Tx,
  user: SessionUser,
  { entryId }: { entryId: string },
): Promise<ActionResult<{ entryId: string }>> {
  const entry = await tx.timeEntry.findUnique({
    where: { id: entryId },
    select: { userId: true, source: true, ticketId: true },
  });
  if (!entry || entry.userId !== user.id || entry.source !== "MANUAL")
    return actionError(
      "NOT_FOUND",
      "Solo puedes borrar tus registros manuales; los del contador se corrigen con un registro nuevo.",
    );
  const ticket = await lockTicket(tx, entry.ticketId);
  if (ticket?.status === "CERRADO" || ticket?.status === "CANCELADO")
    return actionError(
      "INVALID_STATE",
      "El ticket ya terminó. Reábrelo para corregir sus registros.",
    );
  await tx.timeEntry.delete({ where: { id: entryId } });
  return actionOk({ entryId });
}
