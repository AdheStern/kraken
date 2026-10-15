// src/features/admin/actions/send-test-mail.ts
// Pone en la cola un correo de prueba para quien lo pide; el worker lo envía en menos de un minuto
// (criterio de salida de la F0, AGENTS.md §12).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";

export async function sendTestMail(): Promise<ActionResult<{ to: string }>> {
  const { user, denied } = await guardAdmin("system", "el correo");
  if (denied) return denied;
  if (!user.email)
    return actionError("VALIDATION", "Tu cuenta no tiene correo registrado.");
  try {
    await prisma.outboxMessage.create({
      data: {
        eventType: "SISTEMA_CORREO_PRUEBA",
        recipientEmail: user.email,
        subject: "Kraken · Correo de prueba",
        bodyHtml:
          '<h2 style="font-family:Arial,sans-serif;color:#00469D">El correo de Kraken funciona</h2><p style="font-family:Arial,sans-serif">Si lees esto, los avisos de aprobaciones y bolsas de horas te llegarán por aquí.</p>',
      },
    });
    return actionOk({ to: user.email });
  } catch (error) {
    return toActionError(error, "sendTestMail");
  }
}
