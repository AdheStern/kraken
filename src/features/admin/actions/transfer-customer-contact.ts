// src/features/admin/actions/transfer-customer-contact.ts
// «Transferir a otra empresa»: la persona deja su puesto (con el motivo) y empieza uno en otro cliente con sus
// datos nuevos, sin duplicar su ficha (decisión 2026-11-06).
"use server";

import { z } from "zod";
import { toBusinessDate } from "@/domain/calendar/business-date";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { systemClock } from "@/server/clock";
import {
  TransferError,
  transferContactPosition,
} from "@/server/customers/transfer-contact-position";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import { customerContactSchema } from "../schemas/customer-schemas";

const schema = customerContactSchema.omit({ id: true, personId: true }).extend({
  fromContactId: z.uuid(),
  reason: z.string().trim().max(200),
});

export async function transferCustomerContact(
  input: z.input<typeof schema>,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardAdmin("commercial", "clientes");
  if (denied) return denied;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { fromContactId, reason, ...to } = parsed.data;
  try {
    const opened = await runInTransaction(async (tx) => {
      const target = await tx.customer.findUniqueOrThrow({
        where: { id: to.customerId },
        select: { name: true },
      });
      const { closed, opened } = await transferContactPosition(tx, {
        fromContactId,
        to,
        reason: reason || `Pasó a ${target.name}`,
        today: new Date(toBusinessDate(systemClock.now())),
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.cliente_contacto",
        entityId: opened.id,
        action: "TRANSFERIR",
        before: closed,
        after: opened,
      });
      return opened;
    });
    return actionOk({ id: opened.id });
  } catch (error) {
    if (error instanceof TransferError)
      return actionError("INVALID_STATE", error.message);
    return toActionError(error, "transferCustomerContact");
  }
}
