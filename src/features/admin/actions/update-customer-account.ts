// src/features/admin/actions/update-customer-account.ts
// Cambia la contraseña o la configuración del portal de la cuenta de un cliente (AGENTS.md §2.11).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { updateCustomerAccount as update } from "@/server/customer-portal/update-customer-account";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type UpdateCustomerAccountInput,
  updateCustomerAccountSchema,
} from "../schemas/customer-account-schemas";

export async function updateCustomerAccount(
  input: UpdateCustomerAccountInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = updateCustomerAccountSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { password, ...access } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const result = await update(tx, parsed.data);
      if (!result)
        return actionError("NOT_FOUND", "La cuenta no es de un cliente.");
      // REGLA: la contraseña nunca va a la auditoría; solo que cambió (ADR-14).
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.usuario_perfil",
        entityId: access.userId,
        action: "EDITAR_CUENTA_CLIENTE",
        after: { ...access, passwordChanged: password !== "" },
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "updateCustomerAccount");
  }
}
