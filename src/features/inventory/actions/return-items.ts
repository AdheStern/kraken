// src/features/inventory/actions/return-items.ts
// Registra la devolución de una salida, total o parcial, al costo de esa salida (AGENTS.md §2.8, §7 returnItems).
// Operan Almacén, Administración y el GG (§2.9).
"use server";

import Decimal from "decimal.js";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { returnItems as registerReturn } from "@/server/inventory/return-items";
import { runUserAction } from "@/server/run-user-action";
import {
  type ReturnFormInput,
  returnSchema,
} from "../schemas/dispatch-schemas";

export async function returnItems(
  input: ReturnFormInput,
): Promise<ActionResult<{ movementId: string; number: number }>> {
  return runUserAction("returnItems", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG registran devoluciones.",
      );
    const parsed = returnSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { lines, ...rest } = parsed.data;
    const posted = await registerReturn(tx, user.id, {
      ...rest,
      lines: lines.map((l) => ({ ...l, quantity: new Decimal(l.quantity) })),
    });
    return actionOk(posted);
  });
}
