// src/features/admin/actions/update-user-profile.ts
// Cambia la ciudad y el cargo de un usuario. El nombre y el correo vienen de su cuenta de Microsoft.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type UserProfileInput,
  userProfileSchema,
} from "../schemas/user-schemas";

export async function updateUserProfile(
  input: UserProfileInput,
): Promise<ActionResult<null>> {
  const { denied } = await guardAdmin("system", "usuarios");
  if (denied) return denied;
  const parsed = userProfileSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { userId, cityId, jobTitle } = parsed.data;
  try {
    await prisma.userProfile.update({
      where: { userId },
      data: { cityId, jobTitle },
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "updateUserProfile");
  }
}
