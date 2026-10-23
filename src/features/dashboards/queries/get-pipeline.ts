// src/features/dashboards/queries/get-pipeline.ts
// Pipeline comercial: CV cuya última versión está en borrador, en aprobación u observada, con su venta
// (AGENTS.md §6). Alcance por línea con scopeSalesLineQuery (regla 7).
import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeSalesLineQuery } from "@/server/authz/scope-sales-line-query";
import { prisma } from "@/server/db";
import type { PipelineStage } from "../types";
import {
  LINE_AMOUNTS_SELECT,
  lineTotalsOf,
  VERSION_FX_SELECT,
} from "./line-totals";

const STAGES: PipelineStage["status"][] = [
  "BORRADOR",
  "EN_APROBACION",
  "OBSERVADA",
];

export async function getPipeline(
  user: SessionUser,
  filters: { areaId: string | null; cityId: string | null },
): Promise<PipelineStage[]> {
  const lines = await prisma.cvLine.findMany({
    where: {
      AND: [
        scopeSalesLineQuery(user),
        filters.areaId ? { areaId: filters.areaId } : {},
        {
          kind: "ITEM",
          version: {
            status: { in: STAGES },
            cv: {
              isOpeningBalance: false,
              voidedAt: null,
              ...(filters.cityId ? { cityId: filters.cityId } : {}),
            },
          },
        },
      ],
    },
    select: LINE_SELECT,
  });
  // POR QUÉ: una versión observada queda atrás cuando ya hay una nueva en borrador; solo cuenta la última.
  const current = lines.filter(
    (line) => line.version.number === line.version.cv.versions[0]?.number,
  );
  return STAGES.map((status) => {
    const inStage = current.filter((line) => line.version.status === status);
    return {
      status,
      cvCount: new Set(inStage.map((line) => line.version.cvId)).size,
      saleUsd: inStage
        .reduce(
          (acc, line) =>
            acc.plus(lineTotalsOf(line, line.version).totalSaleUsd),
          new Decimal(0),
        )
        .toFixed(2),
    };
  });
}

const LINE_SELECT = {
  ...LINE_AMOUNTS_SELECT,
  version: {
    select: {
      cvId: true,
      number: true,
      status: true,
      ...VERSION_FX_SELECT,
      cv: {
        select: {
          versions: {
            select: { number: true },
            orderBy: { number: "desc" },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.CvLineSelect;
