// src/server/hours/version-bag-plan.ts
// Arma el plan de bolsas de una versión con los datos de la base: líneas de horas de la versión y bolsas del
// CV, emparejadas por linaje (AGENTS.md §2.4). Lo usan el envío (validar) y la aprobación (aplicar).
import Decimal from "decimal.js";
import {
  type BagShortfall,
  findBagShortfalls,
} from "@/domain/hours/check-version-bag-balances";
import {
  type BagPlan,
  type BagSpec,
  type CurrentBag,
  planVersionBags,
  type VersionHourLine,
} from "@/domain/hours/plan-version-bags";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import {
  contractCapMinutes,
  readHourLine,
  type StoredHourLine,
} from "./read-hour-line";

export type PlannedLine = {
  description: string;
  areaId: string | null;
  spec: BagSpec;
};

export type VersionBagContext = {
  customerId: string;
  isOpeningBalance: boolean;
  plan: BagPlan;
  currentBags: CurrentBag[];
  shortfalls: BagShortfall[];
  lines: ReadonlyMap<string, PlannedLine>;
  // Líneas de horas sin especificación válida o con horas que no dan minutos enteros.
  invalidLines: string[];
};

// REGLA: abre bolsa la línea de SERVICIO con unidad de horas, o con unidad de plazo marcada como contrato por
// vigencia (§2.4); readHourLine descarta las de plazo sin marcar.
const HOUR_LINE: Prisma.CvLineWhereInput = {
  kind: "ITEM",
  itemType: "SERVICIO",
  unit: { OR: [{ isHours: true }, { isTerm: true }] },
};

export async function planBagsForVersion(
  tx: Tx,
  versionId: string,
): Promise<VersionBagContext> {
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: {
      cvId: true,
      cv: { select: { customerId: true, isOpeningBalance: true } },
      lines: {
        where: HOUR_LINE,
        orderBy: { position: "asc" },
        select: {
          id: true,
          originLineId: true,
          quantity: true,
          areaId: true,
          description: true,
          hourBagSpec: true,
          coverageStart: true,
          coverageEnd: true,
          unit: { select: { isHours: true, isTerm: true } },
        },
      },
    },
  });
  const { lines, hourLines, invalidLines } = readHourLines(version.lines);
  const currentBags = await loadCurrentBags(tx, version.cvId);
  const plan = planVersionBags(hourLines, currentBags);
  return {
    customerId: version.cv.customerId,
    isOpeningBalance: version.cv.isOpeningBalance,
    plan,
    currentBags,
    shortfalls: findBagShortfalls(plan.ops, currentBags),
    lines,
    invalidLines,
  };
}

type StoredLine = StoredHourLine & {
  id: string;
  originLineId: string | null;
  areaId: string | null;
  description: string;
};

function readHourLines(stored: readonly StoredLine[]) {
  const lines = new Map<string, PlannedLine>();
  const hourLines: VersionHourLine[] = [];
  const invalidLines: string[] = [];
  for (const line of stored) {
    const read = readHourLine(line);
    if (read.kind === "SKIP") continue;
    if (read.kind === "INVALID") {
      invalidLines.push(line.description);
      continue;
    }
    const { spec, minutes } = read;
    lines.set(line.id, {
      description: line.description,
      areaId: line.areaId,
      spec,
    });
    hourLines.push({
      lineId: line.id,
      originLineId: line.originLineId,
      minutes,
      spec,
    });
  }
  return { lines, hourLines, invalidLines };
}

export async function findCvBagIds(tx: Tx, cvId: string): Promise<string[]> {
  const bags = await tx.hourBag.findMany({
    where: { cvLine: { version: { cvId } } },
    select: { id: true },
  });
  return bags.map((bag) => bag.id);
}

async function loadCurrentBags(tx: Tx, cvId: string): Promise<CurrentBag[]> {
  const bags = await tx.hourBag.findMany({
    where: { cvLine: { version: { cvId } } },
    select: {
      id: true,
      kind: true,
      status: true,
      balanceMinutes: true,
      isUncapped: true,
      cvLine: {
        select: {
          id: true,
          originLineId: true,
          quantity: true,
          hourBagSpec: true,
        },
      },
    },
  });
  return bags.map((bag) => ({
    bagId: bag.id,
    rootLineId: bag.cvLine.originLineId ?? bag.cvLine.id,
    status: bag.status,
    lineMinutes:
      bag.kind === "VIGENCIA"
        ? contractCapMinutes(bag.cvLine.hourBagSpec)
        : bag.cvLine.quantity
          ? (toBagMinutes(new Decimal(bag.cvLine.quantity.toString())) ?? 0)
          : 0,
    balanceMinutes: bag.balanceMinutes,
    isUncapped: bag.isUncapped,
  }));
}
