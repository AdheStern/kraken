// src/server/sla/refresh-ticket-sla.ts
// Recalcula y guarda las mediciones del SLA de un ticket (caché de computeSla) y avisa una sola vez al cruzar
// el % configurado (AGENTS.md §2.7 "Alerta al encargado y al coordinador al 75% del SLA").
import { computeSla, type SlaClock } from "@/domain/sla/compute-sla";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { getIntParameter } from "@/server/parameters";
import { loadSlaInput, type SlaContext } from "./load-sla-input";

const DEFAULT_ALERT_PCT = 75;
const KIND_TEXT = {
  PRIMERA_RESPUESTA: "primera respuesta",
  RESOLUCION: "resolución",
} as const;

export async function refreshTicketSla(
  tx: Tx,
  ticketId: string,
  now: Date,
): Promise<void> {
  const context = await loadSlaInput(tx, ticketId, now);
  if (!context) return;
  const alertPct = await getIntParameter(
    "sla.alerta_pct",
    DEFAULT_ALERT_PCT,
    tx,
  );
  for (const clock of computeSla(context.input)) {
    const saved = await tx.slaMeasurement.upsert({
      where: { ticketId_kind: { ticketId, kind: clock.kind } },
      create: {
        ticketId,
        kind: clock.kind,
        ...toColumns(clock, context.policyId),
      },
      update: toColumns(clock, context.policyId),
      select: { id: true, alertedAt: true },
    });
    if (!clock.metAt && clock.pct >= alertPct && !saved.alertedAt)
      await alert(tx, context, clock, saved.id, now);
  }
}

function toColumns(clock: SlaClock, policyId: string) {
  return {
    policyId,
    targetMinutes: clock.targetMinutes,
    elapsedMinutes: clock.elapsedMinutes,
    status: clock.status,
    dueAt: clock.dueAt,
    metAt: clock.metAt,
  };
}

// REGLA: avisa al encargado y a los coordinadores de las áreas del ticket (§2.7).
async function alert(
  tx: Tx,
  context: SlaContext,
  clock: SlaClock,
  measurementId: string,
  now: Date,
) {
  await tx.slaMeasurement.update({
    where: { id: measurementId },
    data: { alertedAt: now },
  });
  const coordinators = await tx.userRole.findMany({
    where: {
      role: { code: "COORDINADOR_SOPORTE" },
      areaId: { in: context.ticket.areaIds },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  const { ticket } = context;
  const breached = clock.status === "INCUMPLIDO";
  await notify(tx, {
    event: "SLA_ALERTA",
    userIds: [
      ...(ticket.ownerId ? [ticket.ownerId] : []),
      ...coordinators.map((c) => c.userId),
    ],
    title: `Ticket #${ticket.number}: ${breached ? "superó" : `va al ${clock.pct}% de`} su SLA de ${KIND_TEXT[clock.kind]}`,
    body: `«${ticket.title}». ${breached ? "Ya pasó el tiempo comprometido." : "Atiéndelo antes de que venza."}`,
    link: `/tickets/${ticket.id}`,
  });
}
