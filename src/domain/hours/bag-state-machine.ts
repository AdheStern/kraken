// src/domain/hours/bag-state-machine.ts
// Estados de una bolsa de horas y sus transiciones permitidas (AGENTS.md §8).

export type BagStatus = "ACTIVA" | "AGOTADA" | "VENCIDA" | "CERRADA";

// REGLA: VENCIDA y CERRADA son terminales; una bolsa agotada también vence o se cierra (§8).
const TRANSITIONS: Readonly<Record<BagStatus, readonly BagStatus[]>> = {
  ACTIVA: ["AGOTADA", "VENCIDA", "CERRADA"],
  AGOTADA: ["ACTIVA", "VENCIDA", "CERRADA"],
  VENCIDA: [],
  CERRADA: [],
};

export function canTransitionBag(from: BagStatus, to: BagStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminalBagStatus(status: BagStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

// Estado que corresponde tras un movimiento: el saldo decide entre ACTIVA y AGOTADA; los terminales no cambian.
export function nextBagStatus(
  current: BagStatus,
  balanceMinutes: number,
): BagStatus {
  if (balanceMinutes < 0)
    throw new RangeError("El saldo de una bolsa nunca es negativo.");
  if (current === "ACTIVA" && balanceMinutes === 0) return "AGOTADA";
  if (current === "AGOTADA" && balanceMinutes > 0) return "ACTIVA";
  return current;
}
