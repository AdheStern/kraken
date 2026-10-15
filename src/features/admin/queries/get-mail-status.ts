// src/features/admin/queries/get-mail-status.ts
// Estado del correo saliente (outbox, ADR-08): por dónde sale, pendientes, enviados hoy y los que fallaron.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem. No expone el cuerpo.
import { fromZonedTime } from "date-fns-tz";
import {
  BUSINESS_TIME_ZONE,
  toBusinessDate,
} from "@/domain/calendar/business-date";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { describeMailTransport } from "@/server/mail/describe-mail-transport";
import type { MailStatus } from "../types";

const FAILED_ROWS = 20;

export async function getMailStatus(): Promise<MailStatus> {
  const now = systemClock.now();
  const dayStart = fromZonedTime(
    `${toBusinessDate(now)}T00:00:00`,
    BUSINESS_TIME_ZONE,
  );
  const [pending, oldestPending, sentToday, failed] = await Promise.all([
    prisma.outboxMessage.count({ where: { status: "PENDIENTE" } }),
    prisma.outboxMessage.findFirst({
      where: { status: "PENDIENTE" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.outboxMessage.count({
      where: { status: "ENVIADO", sentAt: { gte: dayStart } },
    }),
    prisma.outboxMessage.findMany({
      where: { status: "FALLIDO" },
      orderBy: { createdAt: "desc" },
      take: FAILED_ROWS,
      select: {
        id: true,
        recipientEmail: true,
        subject: true,
        attempts: true,
        lastError: true,
        createdAt: true,
      },
    }),
  ]);
  return {
    transport: describeMailTransport(),
    pending,
    oldestPendingAt: oldestPending?.createdAt.toISOString() ?? null,
    sentToday,
    failed: failed.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}
