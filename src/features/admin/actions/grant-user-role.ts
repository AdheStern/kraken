// src/features/admin/actions/grant-user-role.ts
// Asigna a mano un rol (con su área si corresponde) a un usuario. Los permisos de varios roles se suman (§1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type GrantUserRoleInput,
  grantUserRoleSchema,
} from "../schemas/user-schemas";

export async function grantUserRole(
  input: GrantUserRoleInput,
): Promise<ActionResult<{ id: string }>> {
  const { denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = grantUserRoleSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { userId, role, areaId } = parsed.data;
  try {
    const roleRow = await prisma.role.findUniqueOrThrow({
      where: { code: role },
    });
    // TRAMPA: la unicidad (usuario, rol, área) trata los null como iguales (NULLS NOT DISTINCT, §4).
    const twin = await prisma.userRole.findFirst({
      where: { userId, roleId: roleRow.id, areaId },
      select: { id: true },
    });
    if (twin)
      return actionError(
        "CONFLICT",
        areaId ? "Ya tiene ese rol en esa área." : "Ya tiene ese rol.",
      );
    const saved = await prisma.userRole.create({
      data: { userId, roleId: roleRow.id, areaId, source: "MANUAL" },
    });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "grantUserRole");
  }
}
