// src/features/help/actions/mark-tour-seen.ts
// Marca un recorrido guiado como visto (decisión 2026-11-05). No se audita: es una preferencia de interfaz.
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

const tourId = z.string().regex(/^[a-z-]{2,40}$/);

export async function markTourSeen(id: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return actionError("UNAUTHENTICATED", "Tu sesión expiró.");
  if (!tourId.safeParse(id).success)
    return actionError("VALIDATION", "Recorrido desconocido.");
  try {
    await prisma.tourSeen.upsert({
      where: { userId_tourId: { userId: user.id, tourId: id } },
      create: { userId: user.id, tourId: id },
      update: {},
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "markTourSeen");
  }
}
