// src/features/admin/actions/map-entra-group.ts
// Asocia un grupo de Entra ID a un rol y área: quienes estén en el grupo reciben ese rol al iniciar sesión
// (AGENTS.md ADR-05, §7 mapEntraGroup).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { prisma, runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type EntraGroupMappingInput,
  entraGroupMappingSchema,
} from "../schemas/entra-group-schemas";

export async function mapEntraGroup(
  input: EntraGroupMappingInput,
): Promise<ActionResult<{ id: string }>> {
  const { user, denied } = await guardAdmin("system", "los grupos de Entra");
  if (denied) return denied;
  const parsed = entraGroupMappingSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { entraGroupId, groupName, role, areaId } = parsed.data;
  try {
    const roleRow = await prisma.role.findUniqueOrThrow({
      where: { code: role },
    });
    const twin = await prisma.entraGroupRole.findFirst({
      where: { entraGroupId, roleId: roleRow.id, areaId },
      select: { id: true },
    });
    if (twin)
      return actionError("CONFLICT", "Ese grupo ya da ese rol en esa área.");
    // POR QUÉ: el nombre es solo para leerlo aquí; se actualiza en todos los mapeos del mismo grupo.
    const saved = await runInTransaction(async (tx) => {
      await tx.entraGroupRole.updateMany({
        where: { entraGroupId },
        data: { groupName },
      });
      const created = await tx.entraGroupRole.create({
        data: { entraGroupId, groupName, roleId: roleRow.id, areaId },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.grupo_entra_rol",
        entityId: entraGroupId,
        action: "MAPEAR",
        after: { groupName, role, areaId },
      });
      return created;
    });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "mapEntraGroup");
  }
}
