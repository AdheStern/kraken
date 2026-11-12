// src/features/admin/actions/change-cv-customer.ts
// Cambia el cliente de un CV en cualquier estado; solo el administrador del sistema (§2.3, decisión 2026-11-12).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canChangeCvCustomer } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { changeCvCustomerInTx } from "@/server/sales-control/change-cv-customer";
import { getSessionUser } from "@/server/session";
import {
  type ChangeCvCustomerInput,
  changeCvCustomerSchema,
} from "../schemas/cv-customer-schema";

export async function changeCvCustomer(
  input: ChangeCvCustomerInput,
): Promise<ActionResult<{ bags: number }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canChangeCvCustomer(user))
    return actionError(
      "FORBIDDEN",
      "Solo el administrador del sistema cambia el cliente de un CV.",
    );
  const parsed = changeCvCustomerSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    return await runInTransaction((tx) =>
      changeCvCustomerInTx(tx, { ...parsed.data, actorId: user.id }),
    );
  } catch (error) {
    return toActionError(error, "changeCvCustomer");
  }
}
