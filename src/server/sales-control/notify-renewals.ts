// src/server/sales-control/notify-renewals.ts
// Job renewals.notify: avisa a los vendedores del CV y a los gerentes del área de la línea cuando una vigencia
// (soporte, suscripción, licencia) cruza los días configurados, una vez por linaje y umbral (AGENTS.md §2.1
// "Vigencia", §7; decisión 2026-11-05).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { Clock } from "@/domain/clock";
import { addDays, daysUntil } from "@/domain/dashboards/renewals";
import { dueRenewalWarning } from "@/domain/sales-control/renewal-warnings";
import type { PrismaClient } from "@/generated/prisma/client";
import { getIntListParameter } from "@/server/parameters";
import { loadRenewalLines, type RenewalLine } from "./load-renewal-lines";
import { type DueRenewalGroup, sendRenewalNotice } from "./send-renewal-notice";

export const RENEWAL_DAYS_PARAMETER = "cv.aviso_renovacion_dias";
const DEFAULT_DAYS = [60, 15];

export type NotifyRenewalsResult = { notices: number; lines: number };

// POR QUÉ: una transacción por CV y umbral; si una falla, las demás salen y el job reintenta la que quedó.
export async function notifyRenewals(
  db: PrismaClient,
  clock: Clock,
): Promise<NotifyRenewalsResult> {
  const today = toBusinessDate(clock.now());
  const thresholds = await getIntListParameter(
    RENEWAL_DAYS_PARAMETER,
    DEFAULT_DAYS,
    db,
  );
  const until = addDays(today, Math.max(...thresholds));
  const lines = await loadRenewalLines(db, today, until);
  const groups = groupDue(lines, today, thresholds);
  for (const group of groups.values())
    await db.$transaction((tx) => sendRenewalNotice(tx, group, today));
  return {
    notices: groups.size,
    lines: [...groups.values()].reduce((n, g) => n + g.lines.length, 0),
  };
}

function groupDue(
  lines: readonly RenewalLine[],
  today: string,
  thresholds: readonly number[],
): Map<string, DueRenewalGroup> {
  const groups = new Map<string, DueRenewalGroup>();
  for (const line of lines) {
    const due = dueRenewalWarning(
      daysUntil(today, line.coverageEnd),
      thresholds,
      line.sentDays,
    );
    if (!due) continue;
    const key = `${line.cvId}:${due.days}`;
    const group = groups.get(key) ?? { days: due.days, lines: [] };
    group.lines.push({ ...line, markDays: due.markDays });
    groups.set(key, group);
  }
  return groups;
}
