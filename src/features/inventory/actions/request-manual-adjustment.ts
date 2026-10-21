// src/features/inventory/actions/request-manual-adjustment.ts
// Pide un ajuste manual escrito por código de producto (AGENTS.md §2.8): resuelve cada código del catálogo y
// deja la solicitud esperando aprobación. Lo piden quienes operan inventario (§2.9).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requestAdjustment } from "@/server/inventory/adjustments/request-adjustment";
import { runUserAction } from "@/server/run-user-action";

const manualSchema = z.object({
  warehouseId: z.uuid("Elige el almacén."),
  areaId: z.uuid().nullable(),
  reason: z
    .string()
    .trim()
    .max(300, "El motivo es muy largo; usa hasta 300 caracteres."),
  rows: z
    .array(
      z.object({
        code: z.string().trim().min(1, "Falta el código de una fila.").max(60),
        delta: z.string().trim(),
        unitCostUsd: z.string().trim(),
        serials: z.string().max(5000),
      }),
    )
    .min(1, "Agrega al menos una diferencia.")
    .max(200, "Ajusta hasta 200 productos a la vez."),
});

export type ManualAdjustmentInput = z.input<typeof manualSchema>;

export async function requestManualAdjustment(
  input: ManualAdjustmentInput,
): Promise<ActionResult<{ requestId: string }>> {
  return runUserAction("requestManualAdjustment", async (tx, user) => {
    if (!canOperateInventory(user))
      return actionError(
        "FORBIDDEN",
        "Solo Almacén, Administración o el GG piden ajustes.",
      );
    const parsed = manualSchema.safeParse(input);
    if (!parsed.success)
      return actionError("VALIDATION", parsed.error.issues[0].message);
    const { rows, ...rest } = parsed.data;
    const products = await tx.product.findMany({
      where: {
        isActive: true,
        code: { in: rows.map((r) => r.code), mode: "insensitive" },
      },
      select: { id: true, code: true },
    });
    const idOf = new Map(products.map((p) => [p.code.toUpperCase(), p.id]));
    const missing = rows.find((r) => !idOf.has(r.code.toUpperCase()));
    if (missing)
      return actionError(
        "VALIDATION",
        `No existe un producto activo con el código ${missing.code}.`,
      );
    const created = await requestAdjustment(tx, user.id, {
      ...rest,
      origin: "MANUAL",
      lines: rows.map((r) => ({
        productId: idOf.get(r.code.toUpperCase()) as string,
        delta: r.delta.replace(",", "."),
        unitCostUsd: r.unitCostUsd ? r.unitCostUsd.replace(",", ".") : null,
        serials: r.serials.split(/[\s,;]+/).filter(Boolean),
        transferLineId: null,
        systemQuantity: null,
      })),
    });
    return actionOk(created);
  });
}
