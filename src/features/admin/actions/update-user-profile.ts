// src/features/admin/actions/update-user-profile.ts
// Cambia la ciudad y el cargo de un usuario. El nombre y el correo vienen de su cuenta de Microsoft.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type UserProfileInput,
  userProfileSchema,
} from "../schemas/user-schemas";

export async function updateUserProfile(
  input: UserProfileInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = userProfileSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { userId, cityId, jobTitle } = parsed.data;
  try {
    await runInTransaction(async (tx) => {
      const before = await tx.userProfile.findUnique({
        where: { userId },
        select: { cityId: true, jobTitle: true },
      });
      await tx.userProfile.update({
        where: { userId },
        data: { cityId, jobTitle },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.usuario_perfil",
        entityId: userId,
        action: "EDITAR",
        before,
        after: { cityId, jobTitle },
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "updateUserProfile");
  }
}
