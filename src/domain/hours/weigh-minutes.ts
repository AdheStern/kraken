// src/domain/hours/weigh-minutes.ts
// Minutos ponderados de un tramo según la modalidad de la bolsa que los recibe (AGENTS.md §2.5).

export type BagModality = "H8X5" | "H24X7";

export type SplitMinutes = { insideMinutes: number; outsideMinutes: number };

// REGLA: en 8x5 un minuto fuera de horario o en feriado descuenta 2; en 24x7 todo es 1 a 1 (§2.5).
// [CONFIRMAR] el multiplicador 2 con DIMA; vive solo en esta tabla (regla 16).
export const OUTSIDE_HOURS_MULTIPLIER: Readonly<Record<BagModality, number>> = {
  H8X5: 2,
  H24X7: 1,
};

// LIMITACIÓN: no redondea; la fracción de minuto ponderado se sube al minuto al asignar a la bolsa (§2.6).
export function weighMinutes(
  { insideMinutes, outsideMinutes }: SplitMinutes,
  modality: BagModality,
): number {
  if (insideMinutes < 0 || outsideMinutes < 0)
    throw new RangeError("Los minutos no pueden ser negativos.");
  return insideMinutes + outsideMinutes * OUTSIDE_HOURS_MULTIPLIER[modality];
}
