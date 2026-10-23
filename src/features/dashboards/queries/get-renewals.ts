// src/features/dashboards/queries/get-renewals.ts
// Renovaciones próximas: líneas de versiones aprobadas vigentes cuya vigencia termina en los próximos 90 días
// (AGENTS.md §2.1 "Vigencia", §6). Alcance por línea con scopeSalesLineQuery (regla 7).
import { toBusinessDate } from "@/domain/calendar/business-date";
import type { Clock } from "@/domain/clock";
import {
  addDays,
  daysUntil,
  RENEWAL_HORIZON_DAYS,
  renewalBands,
} from "@/domain/dashboards/renewals";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeSalesLineQuery } from "@/server/authz/scope-sales-line-query";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import type { RenewalsView } from "../types";
import {
  LINE_AMOUNTS_SELECT,
  lineTotalsOf,
  VERSION_FX_SELECT,
} from "./line-totals";

export async function getRenewals(
  user: SessionUser,
  filters: { areaId: string | null; cityId: string | null },
  clock: Clock = systemClock,
): Promise<RenewalsView> {
  const today = toBusinessDate(clock.now());
  const lines = await prisma.cvLine.findMany({
    where: {
      AND: [
        scopeSalesLineQuery(user),
        filters.areaId ? { areaId: filters.areaId } : {},
        {
          kind: "ITEM",
          coverageEnd: {
            gte: new Date(`${today}T00:00:00Z`),
            lte: new Date(`${addDays(today, RENEWAL_HORIZON_DAYS)}T00:00:00Z`),
          },
          version: {
            status: "APROBADA",
            cv: {
              isOpeningBalance: false,
              voidedAt: null,
              ...(filters.cityId ? { cityId: filters.cityId } : {}),
            },
          },
        },
      ],
    },
    orderBy: { coverageEnd: "asc" },
    select: {
      id: true,
      description: true,
      coverageEnd: true,
      ...LINE_AMOUNTS_SELECT,
      version: {
        select: {
          number: true,
          ...VERSION_FX_SELECT,
          cv: {
            select: {
              id: true,
              code: true,
              customer: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  const items = lines.map((line) => {
    const coverageEnd = line.coverageEnd?.toISOString().slice(0, 10) ?? today;
    return {
      lineId: line.id,
      cvId: line.version.cv.id,
      cvLabel: toCvVersionLabel(line.version.cv.code, line.version.number),
      customerName: line.version.cv.customer.name,
      description: line.description,
      coverageEnd,
      daysLeft: daysUntil(today, coverageEnd),
      sale: lineTotalsOf(line, line.version).totalSaleUsd,
    };
  });
  return {
    bands: renewalBands(
      items.map((i) => ({ daysLeft: i.daysLeft, saleUsd: i.sale })),
    ).map((b) => ({ ...b, saleUsd: b.saleUsd.toFixed(2) })),
    items: items.map(({ sale, ...item }) => ({
      ...item,
      saleUsd: sale.toFixed(2),
    })),
  };
}
