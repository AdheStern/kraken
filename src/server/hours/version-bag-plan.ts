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
import type { Tx } from "@/server/db";
import { readBagSpec } from "./read-bag-spec";

export type PlannedLine = {
  description: string;
  areaId: string | null;
  spec: BagSpec;
};

export type VersionBagContext = {
  customerId: string;
  plan: BagPlan;
  currentBags: CurrentBag[];
  shortfalls: BagShortfall[];
  lines: ReadonlyMap<string, PlannedLine>;
  // Líneas de horas sin especificación válida o con horas que no dan minutos enteros.
  invalidLines: string[];
};

// REGLA: es línea de horas la de tipo SERVICIO con unidad de horas (§2.4); solo ella abre bolsa.
const HOUR_LINE = {
  kind: "ITEM",
  itemType: "SERVICIO",
  unit: { isHours: true },
} as const;

export async function planBagsForVersion(
  tx: Tx,
  versionId: string,
): Promise<VersionBagContext> {
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: {
      cvId: true,
      cv: { select: { customerId: true } },
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
        },
      },
    },
  });
  const { lines, hourLines, invalidLines } = readHourLines(version.lines);
  const currentBags = await loadCurrentBags(tx, version.cvId);
  const plan = planVersionBags(hourLines, currentBags);
  return {
    customerId: version.cv.customerId,
    plan,
    currentBags,
    shortfalls: findBagShortfalls(plan.ops, currentBags),
    lines,
    invalidLines,
  };
}

type StoredLine = {
  id: string;
  originLineId: string | null;
  quantity: { toString(): string } | null;
  areaId: string | null;
  description: string;
  hourBagSpec: unknown;
};

function readHourLines(stored: readonly StoredLine[]) {
  const lines = new Map<string, PlannedLine>();
  const hourLines: VersionHourLine[] = [];
  const invalidLines: string[] = [];
  for (const line of stored) {
    const spec = readBagSpec(line.hourBagSpec);
    const minutes = line.quantity
      ? toBagMinutes(new Decimal(line.quantity.toString()))
      : null;
    if (!spec || minutes === null) {
      invalidLines.push(line.description);
      continue;
    }
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
      status: true,
      balanceMinutes: true,
      cvLine: { select: { id: true, originLineId: true, quantity: true } },
    },
  });
  return bags.map((bag) => ({
    bagId: bag.id,
    rootLineId: bag.cvLine.originLineId ?? bag.cvLine.id,
    status: bag.status,
    lineMinutes: bag.cvLine.quantity
      ? (toBagMinutes(new Decimal(bag.cvLine.quantity.toString())) ?? 0)
      : 0,
    balanceMinutes: bag.balanceMinutes,
  }));
}
