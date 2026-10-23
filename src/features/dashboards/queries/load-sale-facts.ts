// src/features/dashboards/queries/load-sale-facts.ts
// Hechos de venta de un intervalo: una fila por línea ITEM de la versión aprobada vigente de cada CV cerrado en
// él, con sus montos del dominio de precios (AGENTS.md §6). Pasa por scopeSalesLineQuery (regla 7).
import { toBusinessDate } from "@/domain/calendar/business-date";
import { toSaleAmounts } from "@/domain/dashboards/sale-amounts";
import type { SaleFact } from "@/domain/dashboards/sales-breakdown";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeSalesLineQuery } from "@/server/authz/scope-sales-line-query";
import { prisma } from "@/server/db";
import {
  dec,
  LINE_AMOUNTS_SELECT,
  lineTotalsOf,
  VERSION_FX_SELECT,
} from "./line-totals";

export type SaleFactFilters = {
  start: Date;
  end: Date;
  areaId: string | null;
  cityId: string | null;
};

export async function loadSaleFacts(
  user: SessionUser,
  filters: SaleFactFilters,
): Promise<SaleFact[]> {
  const closedOn = await loadClosingDates(filters);
  if (closedOn.size === 0) return [];
  const lines = await prisma.cvLine.findMany({
    where: {
      AND: [
        scopeSalesLineQuery(user),
        lineFilters(filters),
        {
          kind: "ITEM",
          version: { status: "APROBADA", cvId: { in: [...closedOn.keys()] } },
        },
      ],
    },
    select: LINE_SELECT,
  });
  return lines.map((line) => toFact(line, closedOn));
}

// POR QUÉ: la venta se fecha en la primera aprobación del CV (cierre) aunque sus montos sean los de la versión
// vigente; los CV de saldo inicial y los anulados no son ventas (§6, decisión 2026-10-22).
async function loadClosingDates(
  filters: SaleFactFilters,
): Promise<Map<string, string>> {
  const firsts = await prisma.cvVersion.groupBy({
    by: ["cvId"],
    where: {
      approvedAt: { not: null },
      cv: {
        isOpeningBalance: false,
        voidedAt: null,
        ...(filters.cityId ? { cityId: filters.cityId } : {}),
      },
    },
    _min: { approvedAt: true },
    having: {
      approvedAt: { _min: { gte: filters.start, lt: filters.end } },
    },
  });
  return new Map(
    firsts.flatMap((row) =>
      row._min.approvedAt
        ? [[row.cvId, toBusinessDate(row._min.approvedAt)]]
        : [],
    ),
  );
}

function lineFilters(filters: SaleFactFilters): Prisma.CvLineWhereInput {
  return filters.areaId ? { areaId: filters.areaId } : {};
}

const LINE_SELECT = {
  areaId: true,
  technologyId: true,
  ...LINE_AMOUNTS_SELECT,
  hourBagSpec: true,
  version: {
    select: {
      cvId: true,
      mainTechnologyId: true,
      ...VERSION_FX_SELECT,
      sellers: { select: { userId: true } },
      cv: { select: { cityId: true, customerId: true } },
    },
  },
} satisfies Prisma.CvLineSelect;

type Line = Prisma.CvLineGetPayload<{ select: typeof LINE_SELECT }>;

function toFact(line: Line, closedOn: Map<string, string>): SaleFact {
  const { version } = line;
  const quantity = dec(line.quantity);
  const totals = lineTotalsOf(line, version);
  // REGLA: las horas vendidas son las de las líneas con bolsa, en minutos enteros (regla 4).
  const hoursMinutes = line.hourBagSpec ? (toBagMinutes(quantity) ?? 0) : 0;
  return {
    cvId: version.cvId,
    closedOn: closedOn.get(version.cvId) ?? "",
    areaId: line.areaId ?? "",
    technologyId: line.technologyId ?? version.mainTechnologyId,
    cityId: version.cv.cityId,
    customerId: version.cv.customerId,
    sellerIds: version.sellers.map((s) => s.userId),
    amounts: toSaleAmounts(totals, hoursMinutes),
  };
}
