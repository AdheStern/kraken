// src/features/inventory/actions/send-transfer.ts
// Envía un traspaso en borrador: el stock pasa del origen a TRANSITO (AGENTS.md §2.8, §7 sendTransfer).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { sendTransfer as send } from "@/server/inventory/transfers/send-transfer";
import { runUserAction } from "@/server/run-user-action";
import { transferIdSchema } from "../schemas/transfer-schemas";

export async function sendTransfer(input: {
  transferId: string;
}): Promise<ActionResult<null>> {
  return runUserAction("sendTransfer", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG envían traspasos.",
      );
    const parsed = transferIdSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    await send(tx, user.id, parsed.data.transferId);
    return actionOk(null);
  });
}
