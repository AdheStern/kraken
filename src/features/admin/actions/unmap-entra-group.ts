// src/features/admin/actions/unmap-entra-group.ts
// Quita el mapeo de un grupo de Entra a un rol. El rol se quita al instante a quienes lo tenían desde Entra.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type UnmapEntraGroupInput,
  unmapEntraGroupSchema,
} from "../schemas/entra-group-schemas";

// POR QUÉ: sin el token no se sabe quién sigue teniendo ese rol por otro grupo; se quita a todos (lo seguro)
// y quien lo tenga por otro grupo lo recupera en su próximo inicio de sesión.
export async function unmapEntraGroup(
  input: UnmapEntraGroupInput,
): Promise<ActionResult<{ revoked: number }>> {
  const { denied } = await guardAdmin("system", "los grupos de Entra");
  if (denied) return denied;
  const parsed = unmapEntraGroupSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    const revoked = await runInTransaction(async (tx) => {
      const mapping = await tx.entraGroupRole.delete({
        where: { id: parsed.data.id },
      });
      const { count } = await tx.userRole.deleteMany({
        where: {
          source: "ENTRA",
          roleId: mapping.roleId,
          areaId: mapping.areaId,
        },
      });
      return count;
    });
    return actionOk({ revoked });
  } catch (error) {
    return toActionError(error, "unmapEntraGroup");
  }
}
