// src/features/hours/queries/get-hour-bag.ts
// Una bolsa con su libro mayor completo y el saldo después de cada movimiento; null si no existe o no es
// visible para el usuario (AGENTS.md §2.4, §5 "Bolsas de un cliente").
import { toBusinessDate } from "@/domain/calendar/business-date";
import { canAdjustHourBag } from "@/server/authz/hour-bag-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { getBagAlertSettings } from "@/server/hours/bag-alert-settings";
import type { BagDetail, BagLedgerEntry } from "../types";
import { BAG_SELECT, loadMovementTotals, toBagSummary } from "./bag-records";

export async function getHourBag(
  user: SessionUser,
  bagId: string,
): Promise<BagDetail | null> {
  const record = await prisma.hourBag.findFirst({
    where: { AND: [{ id: bagId }, scopeHourBagQuery(user)] },
    select: {
      ...BAG_SELECT,
      movements: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          kind: true,
          minutes: true,
          createdAt: true,
          reason: true,
          actor: { select: { user: { select: { name: true } } } },
          ticket: { select: { id: true, number: true } },
        },
      },
    },
  });
  if (!record) return null;
  const [totals, settings] = await Promise.all([
    loadMovementTotals([record.id]),
    getBagAlertSettings(),
  ]);
  let balance = 0;
  const ledger: BagLedgerEntry[] = record.movements.map((m) => {
    balance += m.minutes;
    return {
      id: m.id,
      kind: m.kind,
      minutes: m.minutes,
      balanceAfter: balance,
      createdAt: m.createdAt.toISOString(),
      reason: m.reason,
      // POR QUÉ: sin actor = lo registró un proceso del sistema (job de vencimiento).
      actorName: m.actor?.user.name ?? "Sistema",
      ticketId: m.ticket?.id ?? null,
      ticketNumber: m.ticket?.number ?? null,
    };
  });
  const today = toBusinessDate(systemClock.now());
  return {
    bag: toBagSummary(record, totals.get(record.id) ?? {}, today, settings),
    // POR QUÉ: el libro se lee del más reciente al más antiguo; el saldo acumulado ya va calculado.
    ledger: ledger.reverse(),
    canAdjust: canAdjustHourBag(user, {
      areaIds: record.areas.map((a) => a.areaId),
    }),
  };
}
