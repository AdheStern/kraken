// src/domain/sales-control/approval-reminder.ts
// Cuándo recordar una solicitud de aprobación pendiente: tras 24 h de espera y una sola vez por día de negocio
// (job approvals.reminder, AGENTS.md §2.3 "sin delegación" y §7).
import { toBusinessDate } from "@/domain/calendar/business-date";

export const REMINDER_AFTER_MS = 24 * 3_600_000;

export function isReminderDue(
  createdAt: Date,
  remindedAt: Date | null,
  now: Date,
): boolean {
  if (now.getTime() - createdAt.getTime() < REMINDER_AFTER_MS) return false;
  // REGLA: el día se cuenta en La Paz (regla 5); un reintento del job el mismo día no repite el aviso.
  return !remindedAt || toBusinessDate(remindedAt) < toBusinessDate(now);
}

// Días completos que lleva esperando, para el texto del aviso.
export function waitingDays(createdAt: Date, now: Date): number {
  return Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000);
}
