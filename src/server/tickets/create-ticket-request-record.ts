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

// POR QUÉ: avisa a los coordinadores del área; si no tiene ninguno activo, a sus gerentes y, sin ellos, al GG,
// para que nadie la pierda.
async function handlersOf(
  tx: Tx,
  areaId: string,
  requesterId: string,
): Promise<string[]> {
  for (const code of [
    "COORDINADOR_SOPORTE",
    "GERENTE_AREA",
    "GERENTE_GENERAL",
  ] as const) {
    const rows = await tx.userRole.findMany({
      where: {
        role: { code },
        ...(code !== "GERENTE_GENERAL" && { areaId }),
        user: { isActive: true },
      },
      select: { userId: true },
    });
    const ids = rows.map((r) => r.userId).filter((id) => id !== requesterId);
    if (ids.length > 0) return ids;
  }
  return [];
}
