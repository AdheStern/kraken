// src/features/inventory/actions/cancel-transfer.ts
// Cancela un traspaso en borrador (AGENTS.md §8); lo enviado no se cancela.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { cancelTransfer as cancel } from "@/server/inventory/transfers/cancel-transfer";
import { runUserAction } from "@/server/run-user-action";
import { transferIdSchema } from "../schemas/transfer-schemas";

export async function cancelTransfer(input: {
  transferId: string;
}): Promise<ActionResult<null>> {
  return runUserAction("cancelTransfer", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG cancelan traspasos.",
      );
    const parsed = transferIdSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    await cancel(tx, parsed.data.transferId);
    return actionOk(null);
  });
}
