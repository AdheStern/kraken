// src/domain/hours/apply-rounding.ts
// Redondea el total ponderado de un ticket hacia arriba a múltiplos del paso (30 min por defecto) y reparte
// la diferencia desde la última bolsa usada. Regla normativa: AGENTS.md §2.6 paso 3 y caso HORAS-01 (§15.2).

// REGLA: siempre hacia arriba, 30 min por defecto (§2.6, confirmado por DIMA); el paso vigente es el parámetro
// horas.redondeo_minutos (1 = sin redondeo) y llega como argumento.
export const TICKET_ROUNDING_STEP_MINUTES = 30;

export type RoundingSlot = {
  minutes: number;
  availableMinutes: number;
  isSettled: boolean;
};

export type RoundingResult = {
  roundingMinutes: number[];
  waivedMinutes: number;
};

// REGLA: se aplica una sola vez, sobre el total del ticket, nunca por intervalo (§2.6).
// POR QUÉ: la diferencia va a la última bolsa usada y luego a las siguientes con saldo; lo que no cabe se
// perdona porque no es trabajo real (decisión del 2026-10-19). Una bolsa firme ya no recibe cargos.
export function applyRounding(
  slots: readonly RoundingSlot[],
  stepMinutes: number = TICKET_ROUNDING_STEP_MINUTES,
): RoundingResult {
  const total = slots.reduce((sum, slot) => sum + slot.minutes, 0);
  let remaining = roundUpToStep(total, stepMinutes) - total;
  const roundingMinutes = slots.map(() => 0);
  for (let i = lastUsedIndex(slots); i < slots.length && remaining > 0; i++) {
    const slot = slots[i];
    if (slot.isSettled) continue;
    const taken = Math.min(slot.availableMinutes - slot.minutes, remaining);
    roundingMinutes[i] = taken;
    remaining -= taken;
  }
  return { roundingMinutes, waivedMinutes: remaining };
}

export function roundUpToStep(
  minutes: number,
  stepMinutes: number = TICKET_ROUNDING_STEP_MINUTES,
): number {
  if (!Number.isInteger(stepMinutes) || stepMinutes < 1)
    throw new RangeError("El paso de redondeo es un entero de 1 min o más.");
  return Math.ceil(minutes / stepMinutes) * stepMinutes;
}

function lastUsedIndex(slots: readonly RoundingSlot[]): number {
  for (let i = slots.length - 1; i >= 0; i--)
    if (slots[i].minutes > 0) return i;
  return slots.length;
}
