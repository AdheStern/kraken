// src/features/inventory/actions/submit-inventory-count.ts
// Registra un conteo físico y, si hay diferencias, pide su ajuste (AGENTS.md §2.8). Cuentan quienes operan
// inventario (§2.9).
"use server";

import Decimal from "decimal.js";
import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { submitCount } from "@/server/inventory/count/submit-count";
import { runUserAction } from "@/server/run-user-action";

const countSchema = z.object({
  warehouseId: z.uuid("Elige el almacén."),
  scope: z.enum(["COMPLETO", "PARCIAL"]),
  startedAt: z.iso.datetime(),
  items: z
    .array(
      z.object({
        code: z.string().trim().min(1).max(60),
        quantity: z
          .string()
          .trim()
          .regex(
            /^\d+(\.\d{1,2})?$/,
            "Cada cantidad contada es 0 o más, con hasta 2 decimales.",
          ),
        serials: z.array(z.string().trim().min(1).max(80)).max(500),
        unitCostUsd: z
          .string()
          .trim()
          .regex(
            /^(\d+(\.\d{1,2})?)?$/,
            "El costo es 0 o más con hasta 2 decimales.",
          )
          .transform((v) => v || null),
      }),
    )
    .max(2000, "Cuenta hasta 2000 productos por conteo."),
});

export type InventoryCountInput = z.input<typeof countSchema>;

export async function submitInventoryCount(
  input: InventoryCountInput,
): Promise<ActionResult<{ requestId: string | null; differences: number }>> {
  return runUserAction("submitInventoryCount", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG registran conteos.",
      );
    const parsed = countSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { items, startedAt, ...rest } = parsed.data;
    const result = await submitCount(tx, user.id, {
      ...rest,
      startedAt: new Date(startedAt),
      items: items.map((i) => ({ ...i, quantity: new Decimal(i.quantity) })),
    });
    return actionOk(result);
  });
}
