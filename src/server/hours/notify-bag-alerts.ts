// src/server/hours/notify-bag-alerts.ts
// Avisa en la bandeja y por correo (outbox) cuando un movimiento cruza un umbral de consumo de la bolsa,
// en la misma transacción del movimiento (AGENTS.md §2.4 alertas, ADR-08).
import { crossedThresholds } from "@/domain/hours/crossed-thresholds";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { formatMinutes } from "@/lib/format-minutes";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { getBagAlertSettings } from "./bag-alert-settings";
import type { PostedMovement } from "./post-hour-movement";

const SOLD_KINDS = ["APERTURA", "AJUSTE"] as const;

export async function notifyBagAlerts(
  tx: Tx,
  bagId: string,
  posted: PostedMovement,
  actorId: string | null,
): Promise<void> {
  const sold = await tx.hourMovement.aggregate({
    where: { bagId, kind: { in: [...SOLD_KINDS] } },
    _sum: { minutes: true },
  });
  const soldAfter = sold._sum.minutes ?? 0;
  const soldBefore = (SOLD_KINDS as readonly string[]).includes(posted.kind)
    ? soldAfter - posted.minutes
    : soldAfter;
  const { thresholdsPct } = await getBagAlertSettings(tx);
  const crossed = crossedThresholds(
    { soldMinutes: soldBefore, balanceMinutes: posted.balanceBefore },
    { soldMinutes: soldAfter, balanceMinutes: posted.balanceAfter },
    thresholdsPct,
  );
  const top = crossed.at(-1);
  if (top === undefined) return;

  const bag = await loadBagAudience(tx, bagId);
  const label = toCvVersionLabel(bag.cvCode, bag.versionNumber);
  const isEmpty = posted.balanceAfter === 0;
  await notify(tx, {
    event: isEmpty ? "BOLSA_AGOTADA" : "BOLSA_UMBRAL",
    userIds: bag.userIds.filter((id) => id !== actorId),
    title: isEmpty ? `${label}: bolsa agotada` : `${label}: bolsa al ${top}%`,
    body: `«${bag.description}» de ${bag.customerName}: quedan ${formatMinutes(posted.balanceAfter)} de ${formatMinutes(soldAfter)}.`,
    link: `/horas/${bagId}`,
  });
}

// REGLA: destinatarios = vendedor(es) y creador del CV, gerentes de las áreas de la bolsa y encargados de
// los tickets activos que la usan (§2.4 alertas).
export async function loadBagAudience(tx: Tx, bagId: string) {
  const bag = await tx.hourBag.findUniqueOrThrow({
    where: { id: bagId },
    select: {
      customer: { select: { name: true } },
      areas: { select: { areaId: true } },
      cvLine: {
        select: {
          description: true,
          version: {
            select: {
              number: true,
              sellers: { select: { userId: true } },
              cv: { select: { code: true, createdById: true } },
            },
          },
        },
      },
      ticketBags: {
        where: { ticket: { status: { notIn: ["CERRADO", "CANCELADO"] } } },
        select: { ticket: { select: { ownerId: true } } },
      },
    },
  });
  const managers = await tx.userRole.findMany({
    where: {
      role: { code: "GERENTE_AREA" },
      areaId: { in: bag.areas.map((a) => a.areaId) },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  const { version } = bag.cvLine;
  return {
    cvCode: version.cv.code,
    versionNumber: version.number,
    description: bag.cvLine.description,
    customerName: bag.customer.name,
    userIds: [
      version.cv.createdById,
      ...version.sellers.map((s) => s.userId),
      ...managers.map((m) => m.userId),
      ...bag.ticketBags.flatMap((t) =>
        t.ticket.ownerId ? [t.ticket.ownerId] : [],
      ),
    ],
  };
}
