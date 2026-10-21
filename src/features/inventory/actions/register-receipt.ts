// src/features/inventory/actions/register-receipt.ts
// Registra un ingreso (compra local, importación o inventario inicial) con las filas de la grilla
// (AGENTS.md §2.8, §7 registerReceipt). Operan Almacén, Administración y el GG (§2.9).
"use server";

import { parseReceiptRows } from "@/domain/inventory/parse-receipt-rows";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import {
  type ReceiptResult,
  registerReceipt as register,
} from "@/server/inventory/register-receipt";
import { runUserAction } from "@/server/run-user-action";
import {
  type ReceiptFormInput,
  receiptSchema,
} from "../schemas/receipt-schemas";

export async function registerReceipt(
  input: ReceiptFormInput,
): Promise<ActionResult<ReceiptResult>> {
  return runUserAction("registerReceipt", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG registran ingresos.",
      );
    const parsed = receiptSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { rows, ...receipt } = parsed.data;
    const { lines, issues } = parseReceiptRows(rows);
    const [issue] = issues;
    if (issue)
      return actionError(
        "VALIDATION",
        issue.row > 0 ? `Fila ${issue.row}: ${issue.message}` : issue.message,
      );
    return actionOk(await register(tx, user.id, { ...receipt, lines }));
  });
}
