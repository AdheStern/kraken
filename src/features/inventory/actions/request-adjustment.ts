// src/features/inventory/actions/request-adjustment.ts
// Pide un ajuste de inventario, que entra al libro solo cuando se aprueba (AGENTS.md §2.8, §7 requestAdjustment).
// Lo piden quienes operan inventario (§2.9).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requestAdjustment as request } from "@/server/inventory/adjustments/request-adjustment";
import { runUserAction } from "@/server/run-user-action";
import {
  type AdjustmentRequestFormInput,
  adjustmentRequestSchema,
} from "../schemas/adjustment-schemas";

export async function requestAdjustment(
  input: AdjustmentRequestFormInput,
): Promise<ActionResult<{ requestId: string }>> {
  return runUserAction("requestAdjustment", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG piden ajustes.",
      );
    const parsed = adjustmentRequestSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    return actionOk(await request(tx, user.id, parsed.data));
  });
}
