// src/features/admin/actions/revoke-user-role.ts
// Quita un rol asignado a mano. Los que vienen de un grupo de Entra se quitan sacando a la persona del grupo.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type RevokeUserRoleInput,
  revokeUserRoleSchema,
} from "../schemas/user-schemas";

export async function revokeUserRole(
  input: RevokeUserRoleInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = revokeUserRoleSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    const assigned = await prisma.userRole.findUnique({
      where: { id: parsed.data.userRoleId },
      select: { userId: true, source: true, role: { select: { code: true } } },
    });
    if (!assigned)
      return actionError(
        "NOT_FOUND",
        "El rol ya no está asignado. Recarga la página.",
      );
    if (assigned.source === "ENTRA")
      return actionError(
        "INVALID_STATE",
        "Este rol viene de un grupo de Entra ID; se quita sacando a la persona del grupo.",
      );
    // POR QUÉ: quitarse a sí mismo el rol de administrador lo deja fuera de esta pantalla.
    if (assigned.userId === user.id && assigned.role.code === "ADMIN_SISTEMA")
      return actionError(
        "INVALID_STATE",
        "No puedes quitarte tu propio rol de administrador. Pide a otro administrador que lo haga.",
      );
    await prisma.userRole.delete({ where: { id: parsed.data.userRoleId } });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "revokeUserRole");
  }
}
