// src/features/inventory/actions/set-warehouse-active.ts
// Da de baja o reactiva un almacén (borrado lógico de catálogo, AGENTS.md §4). No se da de baja con stock,
// reservas, traspasos o ajustes pendientes; al reactivar un físico, su ciudad no debe tener otro activo.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { findWarehouseBlocker } from "@/server/inventory/warehouse-blocker";
import { getSessionUser } from "@/server/session";
import {
  type WarehouseActiveInput,
  warehouseActiveSchema,
} from "../schemas/warehouse-schemas";

export async function setWarehouseActive(
  input: WarehouseActiveInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canManageSystem(user))
    return actionError(
      "FORBIDDEN",
      "Solo el administrador del sistema gestiona los almacenes.",
    );
  const parsed = warehouseActiveSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, isActive } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const blocker = isActive ? null : await findWarehouseBlocker(tx, id);
      if (blocker) return actionError("INVALID_STATE", blocker);
      await tx.warehouse.update({ where: { id }, data: { isActive } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "inv.almacen",
        entityId: id,
        action: isActive ? "REACTIVAR" : "BAJA",
        before: { isActive: !isActive },
        after: { isActive },
      });
      return actionOk(null);
    });
  } catch (error) {
    if (hasCode(error, "P2002"))
      return actionError(
        "CONFLICT",
        "La ciudad ya tiene otro almacén físico activo. Dalo de baja antes de reactivar este.",
      );
    return toActionError(error, "setWarehouseActive");
  }
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
