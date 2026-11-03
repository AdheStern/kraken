// src/features/admin/actions/create-customer-account.ts
// Crea la cuenta del portal de una empresa cliente con su contraseña y su configuración (AGENTS.md §2.11).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { createCustomerAccount as create } from "@/server/customer-portal/create-customer-account";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type CreateCustomerAccountInput,
  createCustomerAccountSchema,
} from "../schemas/customer-account-schemas";

export async function createCustomerAccount(
  input: CreateCustomerAccountInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = createCustomerAccountSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { password: _secret, ...visible } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const result = await create(tx, parsed.data);
      if ("conflict" in result) return actionError("CONFLICT", result.conflict);
      // REGLA: la contraseña nunca va a la auditoría (ADR-14).
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.usuario_perfil",
        entityId: result.userId,
        action: "CREAR_CUENTA_CLIENTE",
        after: visible,
      });
      return actionOk({ id: result.userId });
    });
  } catch (error) {
    return toActionError(error, "createCustomerAccount");
  }
}
