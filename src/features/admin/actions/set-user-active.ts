// src/features/admin/actions/set-user-active.ts
// Da de baja o reactiva a un usuario. La baja corta el acceso al instante: se cierran sus sesiones.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type UserActiveInput,
  userActiveSchema,
} from "../schemas/user-schemas";

// LIMITACIÓN: si el usuario sigue activo en Entra, al reactivarlo entra de nuevo; la baja aquí no lo borra allá.
export async function setUserActive(
  input: UserActiveInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = userActiveSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { userId, isActive } = parsed.data;
  // POR QUÉ: un administrador que se da de baja a sí mismo puede dejar el sistema sin nadie que lo gestione.
  if (!isActive && userId === user.id)
    return actionError(
      "INVALID_STATE",
      "No puedes darte de baja a ti mismo. Pide a otro administrador que lo haga.",
    );
  try {
    await runInTransaction(async (tx) => {
      await tx.userProfile.update({ where: { userId }, data: { isActive } });
      if (!isActive) await tx.session.deleteMany({ where: { userId } });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setUserActive");
  }
}
