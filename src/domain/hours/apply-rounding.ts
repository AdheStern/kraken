// src/domain/hours/apply-rounding.ts
// Redondea el total ponderado de un ticket hacia arriba a múltiplos de 30 min y reparte la diferencia
// desde la última bolsa usada. Regla normativa: AGENTS.md §2.6 paso 3 y caso HORAS-01 (§15.2).

// REGLA [CONFIRMAR hacia arriba] (§2.6, §14): el redondeo vive solo en esta constante y en roundUpToStep.
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
export function applyRounding(slots: readonly RoundingSlot[]): RoundingResult {
  const total = slots.reduce((sum, slot) => sum + slot.minutes, 0);
  let remaining = roundUpToStep(total) - total;
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

export function roundUpToStep(minutes: number): number {
  return (
    Math.ceil(minutes / TICKET_ROUNDING_STEP_MINUTES) *
    TICKET_ROUNDING_STEP_MINUTES
  );
}

function lastUsedIndex(slots: readonly RoundingSlot[]): number {
  for (let i = slots.length - 1; i >= 0; i--)
    if (slots[i].minutes > 0) return i;
  return slots.length;
}
