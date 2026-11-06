// src/features/help/actions/was-tour-seen.ts
// Si la persona ya vio un recorrido guiado: se ofrece solo una vez por pantalla, en cualquier equipo
// (decisión 2026-11-05). Un id inválido cuenta como visto para no abrir nada.
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

const tourId = z.string().regex(/^[a-z-]{2,40}$/);

export async function wasTourSeen(id: string): Promise<ActionResult<boolean>> {
  const user = await getSessionUser();
  if (!user) return actionError("UNAUTHENTICATED", "Tu sesión expiró.");
  if (!tourId.safeParse(id).success) return actionOk(true);
  try {
    const seen = await prisma.tourSeen.findUnique({
      where: { userId_tourId: { userId: user.id, tourId: id } },
    });
    return actionOk(seen !== null);
  } catch (error) {
    return toActionError(error, "wasTourSeen");
  }
}
