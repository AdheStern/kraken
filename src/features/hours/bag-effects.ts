// src/features/hours/bag-effects.ts
// Resume lo que hará la aprobación de una versión sobre sus bolsas (abrir, ajustar, cerrar), para avisarlo
// en el editor antes de enviar (AGENTS.md §2.4, fila "Versiones del CV"). Puro.
import type { BagPlan } from "@/domain/hours/plan-version-bags";

export type BagEffects = {
  opened: string[];
  adjusted: { description: string; deltaMinutes: number }[];
  closed: string[];
  problem: string | null;
};

type Names = {
  lineDescription: (lineId: string) => string;
  bagDescription: (bagId: string) => string;
};

// POR QUÉ: re-enlazar o ajustar sin cambio de horas no se avisa; no cambia ningún saldo.
export function summarizeBagEffects(
  plan: BagPlan,
  names: Names,
  problem: string | null,
): BagEffects | null {
  const effects: BagEffects = { opened: [], adjusted: [], closed: [], problem };
  for (const op of plan.ops) {
    if (op.kind === "OPEN")
      effects.opened.push(names.lineDescription(op.lineId));
    if (op.kind === "ADJUST" && op.deltaMinutes !== 0)
      effects.adjusted.push({
        description: names.lineDescription(op.lineId),
        deltaMinutes: op.deltaMinutes,
      });
    if (op.kind === "CLOSE")
      effects.closed.push(names.bagDescription(op.bagId));
  }
  const hasEffects =
    effects.opened.length + effects.adjusted.length + effects.closed.length > 0;
  return hasEffects || problem ? effects : null;
}
