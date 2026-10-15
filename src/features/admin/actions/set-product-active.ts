// src/features/admin/actions/set-product-active.ts
// Da de baja o reactiva un producto: deja de ofrecerse en la grilla del CV; las líneas guardadas no cambian.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import { type ActiveInput, activeSchema } from "../schemas/active-schema";

export async function setProductActive(
  input: ActiveInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("commercial", "productos");
  if (denied) return denied;
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, isActive } = parsed.data;
  try {
    await runInTransaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { isActive } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.producto",
        entityId: id,
        action: isActive ? "REACTIVAR" : "BAJA",
        before: { isActive: !isActive },
        after: { isActive },
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setProductActive");
  }
}
