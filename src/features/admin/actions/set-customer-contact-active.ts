// src/features/admin/actions/set-customer-contact-active.ts
// Da de baja o reactiva un contacto de cliente (borrado lógico de catálogo, AGENTS.md §4).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageContacts } from "@/server/authz/contact-permissions";
import { runInTransaction } from "@/server/db";
import { guardCustomers } from "../customer-guard";
import { type ActiveInput, activeSchema } from "../schemas/active-schema";

export async function setCustomerContactActive(
  input: ActiveInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardCustomers(
    canManageContacts,
    "dar de baja contactos",
  );
  if (denied) return denied;
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, isActive } = parsed.data;
  try {
    await runInTransaction(async (tx) => {
      await tx.customerContact.update({ where: { id }, data: { isActive } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.cliente_contacto",
        entityId: id,
        action: isActive ? "REACTIVAR" : "BAJA",
        before: { isActive: !isActive },
        after: { isActive },
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setCustomerContactActive");
  }
}
