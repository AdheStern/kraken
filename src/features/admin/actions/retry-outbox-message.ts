// src/features/admin/actions/retry-outbox-message.ts
// Vuelve a poner en la cola un correo que falló, con sus intentos en cero (ADR-08). Útil tras corregir un
// permiso de Graph o un buzón lleno.
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";

const inputSchema = z.object({ id: z.uuid() });

export async function retryOutboxMessage(
  input: z.input<typeof inputSchema>,
): Promise<ActionResult<null>> {
  const { denied } = await guardAdmin("system", "el correo");
  if (denied) return denied;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", "Ese correo ya no existe.");
  try {
    const { count } = await prisma.outboxMessage.updateMany({
      where: { id: parsed.data.id, status: "FALLIDO" },
      data: {
        status: "PENDIENTE",
        attempts: 0,
        nextAttemptAt: systemClock.now(),
      },
    });
    if (count === 0)
      return actionError(
        "INVALID_STATE",
        "Ese correo ya no está fallido. Recarga la página.",
      );
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "retryOutboxMessage");
  }
}
