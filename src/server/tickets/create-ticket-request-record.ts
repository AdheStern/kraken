// src/server/tickets/create-ticket-request-record.ts
// Alta de una solicitud de ticket y aviso a quienes la atienden en su área (AGENTS.md §2.6 «Solicitudes de ticket»).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { SessionUser } from "@/server/authz/roles";
import { canRequestTicket } from "@/server/authz/ticket-request-permissions";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";

export type NewTicketRequest = {
  areaId: string;
  title: string;
  description: string;
};

export async function createTicketRequestRecord(
  tx: Tx,
  user: SessionUser,
  input: NewTicketRequest,
  now: Date,
): Promise<ActionResult<{ requestId: string; number: number }>> {
  if (!canRequestTicket(user))
    return actionError(
      "FORBIDDEN",
      "Necesitas un rol en Kraken para pedir tickets. Pídelo al administrador del sistema.",
    );
  const area = await tx.area.findFirst({
    where: { id: input.areaId, isActive: true },
    select: { code: true },
  });
  if (!area)
    return actionError("VALIDATION", "El área no existe o está dada de baja.");
  const request = await tx.ticketRequest.create({
    data: { ...input, requesterId: user.id, createdAt: now },
    select: { id: true, number: true },
  });
  await notify(tx, {
    event: "SOLICITUD_NUEVA",
    userIds: await handlersOf(tx, input.areaId, user.id),
    title: `Solicitud #${request.number} para ${area.code}: ${input.title}`,
    body: `${user.name} pidió un ticket. Revísala y crea el ticket o descártala con un motivo.`,
    link: "/tickets/solicitudes",
  });
  return actionOk({ requestId: request.id, number: request.number });
}

// REGLA: avisa a los coordinadores y a los gerentes del área; si no tiene ninguno activo, al GG, para que nadie
// la pierda (§2.6, decisión 2026-10-29).
async function handlersOf(
  tx: Tx,
  areaId: string,
  requesterId: string,
): Promise<string[]> {
  const inArea = await tx.userRole.findMany({
    where: {
      role: { code: { in: ["COORDINADOR_SOPORTE", "GERENTE_AREA"] } },
      areaId,
      user: { isActive: true },
    },
    select: { userId: true },
  });
  const rows =
    inArea.length > 0
      ? inArea
      : await tx.userRole.findMany({
          where: {
            role: { code: "GERENTE_GENERAL" },
            user: { isActive: true },
          },
          select: { userId: true },
        });
  return [...new Set(rows.map((r) => r.userId))].filter(
    (id) => id !== requesterId,
  );
}
