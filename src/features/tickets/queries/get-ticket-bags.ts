// src/features/tickets/queries/get-ticket-bags.ts
// Bolsas de un ticket: su jerarquía con saldo y consumo proyectado, las bolsas que puede sumar y su pendiente
// sin bolsa (AGENTS.md §2.6 "consumo proyectado" con la misma función del cierre, §5 detalle).
import { allocateTicketHours } from "@/domain/hours/allocate-ticket-hours";
import { bagIneligibility } from "@/domain/tickets/bag-eligibility";
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { findCityWithoutOfficeHours } from "@/server/calendar/find-city-without-office-hours";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { loadTicketAllocation } from "@/server/tickets/load-ticket-allocation";
import type { TicketBagsPanel } from "../types";

export async function getTicketBags(
  user: SessionUser,
  ticketId: string,
): Promise<TicketBagsPanel | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [{ id: ticketId }, scopeTicketQuery(user)] },
    select: {
      id: true,
      cityId: true,
      customerId: true,
      projectId: true,
      areas: { select: { areaId: true } },
      bags: {
        orderBy: { priority: "asc" },
        select: { bagId: true, priority: true },
      },
      pendingHours: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) return null;
  const input = await loadTicketAllocation(prisma, ticket, {
    projectAt: systemClock.now(),
  });
  const allocation = allocateTicketHours(
    input.intervals,
    input.bags,
    input.calendar,
    Math.max(1, input.roundingStepMinutes),
  );
  // POR QUÉ: tras reabrir, una bolsa aparece dos veces (lo firme y su saldo); se muestra la suma.
  const projected = new Map<string, number>();
  for (const { bagId, minutes } of allocation.consumptions)
    projected.set(bagId, (projected.get(bagId) ?? 0) + minutes);
  // POR QUÉ: las cifras de cada bolsa salen de la query pública de horas, con su propio alcance de authz.
  const summaries = new Map(
    (await listHourBags(user, { customerId: ticket.customerId })).map((b) => [
      b.id,
      b,
    ]),
  );
  const inHierarchy = new Set(ticket.bags.map((b) => b.bagId));
  const eligibleIds = await loadEligibleBagIds(ticket);
  return {
    hierarchy: ticket.bags.flatMap(({ bagId, priority }) => {
      const bag = summaries.get(bagId);
      return bag
        ? [{ priority, bag, projectedMinutes: projected.get(bagId) ?? 0 }]
        : [];
    }),
    eligible: [...summaries.values()].filter(
      (b) => eligibleIds.has(b.id) && !inHierarchy.has(b.id),
    ),
    projection: {
      realMinutes: allocation.realMinutes,
      chargedMinutes: allocation.chargedMinutes,
      pendingMinutes:
        allocation.pending.insideMinutes + allocation.pending.outsideMinutes,
      waivedMinutes: allocation.waivedRoundingMinutes,
      cityWithoutOfficeHours: await findCityWithoutOfficeHours(
        prisma,
        ticket.cityId,
      ),
    },
    pending: ticket.pendingHours.map((p) => ({
      id: p.id,
      insideMinutes: p.insideMinutes,
      outsideMinutes: p.outsideMinutes,
      status: p.status,
    })),
  };
}

async function loadEligibleBagIds(ticket: {
  customerId: string;
  projectId: string | null;
  areas: { areaId: string }[];
}): Promise<Set<string>> {
  const bags = await prisma.hourBag.findMany({
    where: { customerId: ticket.customerId, status: "ACTIVA" },
    select: {
      id: true,
      customerId: true,
      status: true,
      scope: true,
      projectId: true,
      areas: { select: { areaId: true } },
    },
  });
  const target = { ...ticket, areaIds: ticket.areas.map((a) => a.areaId) };
  return new Set(
    bags
      .filter(
        (b) =>
          !bagIneligibility(
            { ...b, areaIds: b.areas.map((a) => a.areaId) },
            target,
          ),
      )
      .map((b) => b.id),
  );
}
