// src/server/hours/expire-bags.ts
// Job bags.expire: vence las bolsas cuya fecha pasó (VENCIMIENTO por el saldo) y avisa N días antes y el día
// del vencimiento, una sola vez cada aviso (AGENTS.md §2.4 vencimiento y alertas, §7 jobs).

import { toBusinessDate } from "@/domain/calendar/business-date";
import type { Clock } from "@/domain/clock";
import { isTerminalBagStatus } from "@/domain/hours/bag-state-machine";
import { closingMinutes } from "@/domain/hours/closing-minutes";
import {
  daysUntilExpiry,
  isBagExpired,
  isExpiryWarningDue,
} from "@/domain/hours/expiry";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { PrismaClient } from "@/generated/prisma/client";
import { formatMinutes } from "@/lib/format-minutes";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { getBagAlertSettings } from "./bag-alert-settings";
import { lockBags } from "./lock-bags";
import { loadBagAudience } from "./notify-bag-alerts";
import { postHourMovement } from "./post-hour-movement";

const DAY_MS = 86_400_000;

export type ExpireBagsResult = { expired: number; warned: number };

// POR QUÉ: una transacción por bolsa; si una falla, las demás vencen igual y el job reintenta la que quedó.
export async function expireBags(
  db: PrismaClient,
  clock: Clock,
): Promise<ExpireBagsResult> {
  const now = clock.now();
  const today = toBusinessDate(now);
  const { warningDays } = await getBagAlertSettings(db);
  const horizon = new Date(
    Date.parse(`${today}T00:00:00Z`) + warningDays * DAY_MS,
  );
  const candidates = await db.hourBag.findMany({
    where: {
      status: { in: ["ACTIVA", "AGOTADA"] },
      expiresOn: { lte: horizon },
    },
    select: {
      id: true,
      expiresOn: true,
      expiryWarnedAt: true,
      expiryDayWarnedAt: true,
    },
  });
  const result: ExpireBagsResult = { expired: 0, warned: 0 };
  for (const bag of candidates) {
    const expiresOn = bag.expiresOn?.toISOString().slice(0, 10) ?? null;
    if (!expiresOn) continue;
    if (isBagExpired(expiresOn, today)) {
      if (await db.$transaction((tx) => expireBag(tx, bag.id, expiresOn)))
        result.expired += 1;
      continue;
    }
    const days = daysUntilExpiry(expiresOn, today);
    const isDay = days === 0 && !bag.expiryDayWarnedAt;
    const isAhead =
      days > 0 &&
      !bag.expiryWarnedAt &&
      isExpiryWarningDue(expiresOn, today, warningDays);
    if (isDay || isAhead) {
      await db.$transaction((tx) => warnBag(tx, bag.id, days, now));
      result.warned += 1;
    }
  }
  return result;
}

async function expireBag(
  tx: Tx,
  bagId: string,
  expiresOn: string,
): Promise<boolean> {
  const bag = (await lockBags(tx, [bagId])).get(bagId);
  if (!bag || isTerminalBagStatus(bag.status)) return false;
  await postHourMovement(tx, {
    bagId,
    kind: "VENCIMIENTO",
    minutes: closingMinutes(bag),
    actorId: null,
    reason: `Vencida el ${expiresOn}`,
    endAs: "VENCIDA",
  });
  const audience = await loadBagAudience(tx, bagId);
  await notify(tx, {
    event: "BOLSA_VENCIDA",
    userIds: audience.userIds,
    title: `${toCvVersionLabel(audience.cvCode, audience.versionNumber)}: bolsa vencida`,
    body:
      !bag.isUncapped && bag.balanceMinutes > 0
        ? `«${audience.description}» de ${audience.customerName} venció con ${formatMinutes(bag.balanceMinutes)} sin usar.`
        : `«${audience.description}» de ${audience.customerName} venció.`,
    link: `/horas/${bagId}`,
  });
  return true;
}

async function warnBag(
  tx: Tx,
  bagId: string,
  days: number,
  now: Date,
): Promise<void> {
  await tx.hourBag.update({
    where: { id: bagId },
    data: days === 0 ? { expiryDayWarnedAt: now } : { expiryWarnedAt: now },
  });
  const audience = await loadBagAudience(tx, bagId);
  const when =
    days === 0
      ? "vence hoy"
      : days === 1
        ? "vence mañana"
        : `vence en ${days} días`;
  await notify(tx, {
    event: "BOLSA_POR_VENCER",
    userIds: audience.userIds,
    title: `${toCvVersionLabel(audience.cvCode, audience.versionNumber)}: ${when}`,
    body: `«${audience.description}» de ${audience.customerName}. Después de esa fecha no acepta trabajo.`,
    link: `/horas/${bagId}`,
  });
}
