// src/server/sales-control/remind-approvals.ts
// Job approvals.reminder: a las 09:00 de los días hábiles recuerda a cada aprobador sus solicitudes pendientes
// con más de 24 h, en un solo aviso, una vez por día (AGENTS.md §2.3 "sin delegación", §7 jobs).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { Clock } from "@/domain/clock";
import {
  isReminderDue,
  REMINDER_AFTER_MS,
  waitingDays,
} from "@/domain/sales-control/approval-reminder";
import type { ApprovalTarget } from "@/domain/sales-control/approval-round";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { findApprovers } from "./approvers";

export type RemindApprovalsResult = {
  reminded: number;
  requests: number;
  skipped?: "FERIADO";
};

type Pending = { id: string; createdAt: Date; target: ApprovalTarget };

export async function remindApprovals(
  db: PrismaClient,
  clock: Clock,
): Promise<RemindApprovalsResult> {
  const now = clock.now();
  // REGLA: «días hábiles»: el cron excluye el fin de semana y aquí se salta el feriado nacional.
  const today = new Date(`${toBusinessDate(now)}T00:00:00Z`);
  const holiday = await db.holiday.findFirst({
    where: { date: today, cityId: null, isActive: true },
  });
  if (holiday) return { reminded: 0, requests: 0, skipped: "FERIADO" };
  return db.$transaction((tx) => remindPending(tx, now));
}

async function remindPending(
  tx: Tx,
  now: Date,
): Promise<RemindApprovalsResult> {
  const rows = await tx.cvApprovalRequest.findMany({
    where: {
      status: "PENDIENTE",
      createdAt: { lte: new Date(now.getTime() - REMINDER_AFTER_MS) },
    },
    select: {
      id: true,
      kind: true,
      areaId: true,
      createdAt: true,
      remindedAt: true,
    },
  });
  const due: Pending[] = rows
    .filter((r) => isReminderDue(r.createdAt, r.remindedAt, now))
    .map((r) => ({ id: r.id, createdAt: r.createdAt, target: toTarget(r) }));
  if (due.length === 0) return { reminded: 0, requests: 0 };
  const byUser = await groupByApprover(tx, due);
  for (const [userId, requests] of byUser)
    await notify(tx, noticeFor(userId, requests, now));
  await tx.cvApprovalRequest.updateMany({
    where: { id: { in: due.map((r) => r.id) } },
    data: { remindedAt: now },
  });
  return { reminded: byUser.size, requests: due.length };
}

async function groupByApprover(
  tx: Tx,
  due: readonly Pending[],
): Promise<Map<string, Pending[]>> {
  const approvers = await findApprovers(
    tx,
    due.map((r) => r.target),
  );
  const byUser = new Map<string, Pending[]>();
  due.forEach((request, index) => {
    for (const userId of approvers[index].userIds)
      byUser.set(userId, [...(byUser.get(userId) ?? []), request]);
  });
  return byUser;
}

function noticeFor(userId: string, requests: readonly Pending[], now: Date) {
  const oldest = Math.max(
    ...requests.map((r) => waitingDays(r.createdAt, now)),
  );
  const count = requests.length;
  return {
    event: "CV_RECORDATORIO" as const,
    userIds: [userId],
    title:
      count === 1
        ? "Un CV sigue esperando tu aprobación"
        : `${count} CV siguen esperando tu aprobación`,
    body: `El más antiguo espera hace ${oldest} ${oldest === 1 ? "día" : "días"}. Sin tu decisión no se aprueban.`,
    link: "/aprobaciones",
  };
}

function toTarget(row: {
  kind: "AREA" | "GERENCIA_GENERAL";
  areaId: string | null;
}): ApprovalTarget {
  return row.kind === "AREA" && row.areaId
    ? { kind: "AREA", areaId: row.areaId }
    : { kind: "GERENCIA_GENERAL" };
}
