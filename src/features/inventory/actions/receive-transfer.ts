// src/features/inventory/actions/receive-transfer.ts
// Recibe lo que llegó de un traspaso, por línea y serial; lo que falta queda en TRANSITO como diferencia
// (AGENTS.md §2.8, §7 receiveTransfer).
"use server";

import Decimal from "decimal.js";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { receiveTransfer as receive } from "@/server/inventory/transfers/receive-transfer";
import { runUserAction } from "@/server/run-user-action";
import {
  type TransferReceiptFormInput,
  transferReceiptSchema,
} from "../schemas/transfer-schemas";

export async function receiveTransfer(
  input: TransferReceiptFormInput,
): Promise<ActionResult<{ status: "RECIBIDO" | "RECIBIDO_CON_DIFERENCIAS" }>> {
  return runUserAction("receiveTransfer", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG reciben traspasos.",
      );
    const parsed = transferReceiptSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { transferId, receipts } = parsed.data;
    const result = await receive(
      tx,
      user.id,
      transferId,
      receipts.map((r) => ({ ...r, quantity: new Decimal(r.quantity) })),
    );
    return actionOk(result);
  });
}
