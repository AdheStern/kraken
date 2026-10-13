// src/server/hours/bag-plan-problem.ts
// Traduce un plan de bolsas inviable a un mensaje que dice qué línea corregir (AGENTS.md §2.4, §7).
import { formatMinutes } from "@/lib/format-minutes";
import type { BagPlanError } from "./hour-errors";
import type { VersionBagContext } from "./version-bag-plan";

export type BagPlanProblem = { code: BagPlanError["code"]; message: string };

// POR QUÉ: today es opcional; al enviar se exige un vencimiento futuro, al aprobar ya no se reevalúa.
export function findBagPlanProblem(
  context: VersionBagContext,
  today: string | null,
): BagPlanProblem | null {
  const name = (lineId: string) =>
    `«${context.lines.get(lineId)?.description ?? "línea de horas"}»`;
  const [invalid] = context.invalidLines;
  if (invalid)
    return validation(
      `Completa la bolsa de horas de «${invalid}»: modalidad, alcance y horas que den minutos enteros.`,
    );
  for (const op of context.plan.ops) {
    if (op.kind === "OPEN" && op.minutes === 0)
      return validation(
        `${name(op.lineId)} no tiene horas; quítala o indica cuántas.`,
      );
    if ((op.kind === "OPEN" || op.kind === "ADJUST") && today) {
      const expiresOn = op.spec.expiresOn;
      if (expiresOn !== null && expiresOn < today)
        return validation(
          `El vencimiento de la bolsa de ${name(op.lineId)} ya pasó.`,
        );
    }
  }
  const [terminal] = context.plan.issues;
  if (terminal)
    return {
      code: "INVALID_STATE",
      message: `La bolsa de ${name(terminal.lineId)} está ${terminal.status.toLowerCase()}; no cambies sus horas: agrega una línea nueva.`,
    };
  const [shortfall] = context.shortfalls;
  if (shortfall)
    return {
      code: "INSUFFICIENT_BALANCE",
      message: `${name(shortfall.lineId)} baja ${formatMinutes(-shortfall.deltaMinutes)}, pero a su bolsa le quedan ${formatMinutes(shortfall.balanceMinutes)}.`,
    };
  return null;
}

function validation(message: string): BagPlanProblem {
  return { code: "VALIDATION", message };
}
