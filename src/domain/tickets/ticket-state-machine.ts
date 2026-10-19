// src/domain/tickets/ticket-state-machine.ts
// Estados de un ticket y sus transiciones permitidas (AGENTS.md §8). La interfaz muestra solo estas;
// el servidor vuelve a validarlas.

export type TicketStatus =
  | "NUEVO"
  | "ASIGNADO"
  | "EN_PROGRESO"
  | "EN_ESPERA_CLIENTE"
  | "RESUELTO"
  | "CERRADO"
  | "CANCELADO";

// REGLA: RESUELTO → CERRADO descuenta las horas; CERRADO → EN_PROGRESO reabre con REVERSO (§2.6, §8).
const TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  NUEVO: ["ASIGNADO", "CANCELADO"],
  ASIGNADO: ["EN_PROGRESO", "CANCELADO"],
  EN_PROGRESO: ["EN_ESPERA_CLIENTE", "RESUELTO"],
  EN_ESPERA_CLIENTE: ["EN_PROGRESO"],
  RESUELTO: ["EN_PROGRESO", "CERRADO"],
  CERRADO: ["EN_PROGRESO"],
  CANCELADO: [],
};

export function canTransitionTicket(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}
