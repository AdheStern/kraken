// src/features/inventory/actions/create-transfer.ts
// Arma un traspaso en borrador entre dos almacenes (AGENTS.md §2.8, §7 createTransfer). Operan Almacén,
// Administración y el GG (§2.9).
"use server";

import Decimal from "decimal.js";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { createTransfer as create } from "@/server/inventory/transfers/create-transfer";
import { runUserAction } from "@/server/run-user-action";
import {
  type TransferDraftFormInput,
  transferDraftSchema,
} from "../schemas/transfer-schemas";

export async function createTransfer(
  input: TransferDraftFormInput,
): Promise<ActionResult<{ transferId: string; number: number }>> {
  return runUserAction("createTransfer", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG arman traspasos.",
      );
    const parsed = transferDraftSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { lines, ...rest } = parsed.data;
    const created = await create(tx, user.id, {
      ...rest,
      lines: lines.map((l) => ({ ...l, quantity: new Decimal(l.quantity) })),
    });
    return actionOk(created);
  });
}
