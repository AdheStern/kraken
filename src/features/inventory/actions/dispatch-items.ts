// src/features/inventory/actions/dispatch-items.ts
// Registra una salida (POS) a una línea de CV, a un ticket o a uso interno (AGENTS.md §2.8, §7 dispatchItems).
// Operan Almacén, Administración y el GG (§2.9).
"use server";

import Decimal from "decimal.js";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { dispatchItems as dispatch } from "@/server/inventory/dispatch-items";
import { runUserAction } from "@/server/run-user-action";
import {
  type DispatchFormInput,
  dispatchSchema,
} from "../schemas/dispatch-schemas";

export async function dispatchItems(
  input: DispatchFormInput,
): Promise<ActionResult<{ movementId: string; number: number }>> {
  return runUserAction("dispatchItems", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG registran salidas.",
      );
    const parsed = dispatchSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { lines, ...rest } = parsed.data;
    const posted = await dispatch(tx, user.id, {
      ...rest,
      lines: lines.map((l) => ({ ...l, quantity: new Decimal(l.quantity) })),
    });
    return actionOk(posted);
  });
}
