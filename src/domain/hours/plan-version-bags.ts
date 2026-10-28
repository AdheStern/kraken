// src/domain/hours/plan-version-bags.ts
// Decide qué pasa con las bolsas de un CV al aprobarse una versión: abrir, ajustar, cerrar o solo volver a
// enlazar. Regla normativa: AGENTS.md §2.4 (fila "Versiones del CV" y contratos por vigencia).
import { type BagStatus, isTerminalBagStatus } from "./bag-state-machine";
import { closingMinutes } from "./closing-minutes";
import type { BagModality } from "./weigh-minutes";

export type BagScope = "AREA" | "PROYECTO" | "GENERAL";

export type BagKind = "HORAS" | "VIGENCIA";

// POR QUÉ: en un contrato por vigencia, startsOn y expiresOn son las fechas de la línea y los minutos son el tope.
export type BagSpec = {
  kind: BagKind;
  startsOn: string | null;
  isUncapped: boolean;
  modality: BagModality;
  scope: BagScope;
  areaIds: readonly string[];
  projectId: string | null;
  expiresOn: string | null;
};

// TRAMPA: originLineId es la raíz del linaje (la línea de la versión que abrió la bolsa), no la línea copiada.
export type VersionHourLine = {
  lineId: string;
  originLineId: string | null;
  minutes: number;
  spec: BagSpec;
};

// POR QUÉ: el delta se mide contra los minutos de la línea aprobada vigente (lineMinutes) y no contra lo
// vendido en la bolsa; si no, la versión nueva desharía los ajustes manuales del gerente.
export type CurrentBag = {
  bagId: string;
  rootLineId: string;
  status: BagStatus;
  lineMinutes: number;
  balanceMinutes: number;
  isUncapped: boolean;
};

export type BagOp =
  | { kind: "OPEN"; lineId: string; minutes: number; spec: BagSpec }
  | {
      kind: "ADJUST";
      bagId: string;
      lineId: string;
      deltaMinutes: number;
      spec: BagSpec;
    }
  | { kind: "RELINK"; bagId: string; lineId: string }
  | { kind: "CLOSE"; bagId: string; deltaMinutes: number };

export type BagPlanIssue = {
  // REGLA: pasar un contrato de «sin tope» a «con tope» (o al revés) pide una línea nueva, como una bolsa terminal.
  kind: "TERMINAL_BAG_CHANGED" | "CAP_CHANGED";
  lineId: string;
  bagId: string;
  status: BagStatus;
};

export type BagPlan = { ops: BagOp[]; issues: BagPlanIssue[] };

// REGLA: una bolsa VENCIDA o CERRADA no se reabre; si la versión cambia sus horas, se pide una línea nueva.
export function planVersionBags(
  hourLines: readonly VersionHourLine[],
  currentBags: readonly CurrentBag[],
): BagPlan {
  const unclaimed = new Map(currentBags.map((bag) => [bag.rootLineId, bag]));
  const plan: BagPlan = { ops: [], issues: [] };
  for (const line of hourLines) {
    assertWholeMinutes(line.minutes);
    const root = line.originLineId ?? line.lineId;
    const bag = unclaimed.get(root);
    unclaimed.delete(root);
    if (bag) planExistingBag(plan, line, bag);
    else
      plan.ops.push({
        kind: "OPEN",
        lineId: line.lineId,
        minutes: line.minutes,
        spec: line.spec,
      });
  }
  for (const bag of unclaimed.values()) {
    if (!isTerminalBagStatus(bag.status))
      plan.ops.push({
        kind: "CLOSE",
        bagId: bag.bagId,
        deltaMinutes: closingMinutes(bag),
      });
  }
  return plan;
}

function planExistingBag(
  plan: BagPlan,
  line: VersionHourLine,
  bag: CurrentBag,
): void {
  const deltaMinutes = line.minutes - bag.lineMinutes;
  if (bag.isUncapped !== line.spec.isUncapped) {
    plan.issues.push({
      kind: "CAP_CHANGED",
      lineId: line.lineId,
      bagId: bag.bagId,
      status: bag.status,
    });
  } else if (!isTerminalBagStatus(bag.status)) {
    plan.ops.push({
      kind: "ADJUST",
      bagId: bag.bagId,
      lineId: line.lineId,
      deltaMinutes,
      spec: line.spec,
    });
  } else if (deltaMinutes === 0) {
    plan.ops.push({ kind: "RELINK", bagId: bag.bagId, lineId: line.lineId });
  } else {
    plan.issues.push({
      kind: "TERMINAL_BAG_CHANGED",
      lineId: line.lineId,
      bagId: bag.bagId,
      status: bag.status,
    });
  }
}

function assertWholeMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 0)
    throw new RangeError(`Minutos de línea inválidos: ${minutes}.`);
}
