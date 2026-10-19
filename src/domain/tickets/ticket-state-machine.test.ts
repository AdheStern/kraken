// src/domain/tickets/ticket-state-machine.test.ts
// Transiciones del ticket (AGENTS.md §8): cada flecha permitida y las que no lo están.
import { describe, expect, it } from "vitest";
import { canTransitionTicket, type TicketStatus } from "./ticket-state-machine";

describe("canTransitionTicket", () => {
  it.each<[TicketStatus, TicketStatus]>([
    ["NUEVO", "ASIGNADO"],
    ["ASIGNADO", "EN_PROGRESO"],
    ["EN_PROGRESO", "EN_ESPERA_CLIENTE"],
    ["EN_ESPERA_CLIENTE", "EN_PROGRESO"],
    ["EN_PROGRESO", "RESUELTO"],
    ["RESUELTO", "EN_PROGRESO"],
    ["RESUELTO", "CERRADO"],
    ["CERRADO", "EN_PROGRESO"],
    ["NUEVO", "CANCELADO"],
    ["ASIGNADO", "CANCELADO"],
  ])("%s → %s", (from, to) => {
    expect(canTransitionTicket(from, to)).toBe(true);
  });

  it.each<[TicketStatus, TicketStatus]>([
    ["EN_PROGRESO", "CERRADO"],
    ["NUEVO", "CERRADO"],
    ["CERRADO", "RESUELTO"],
    ["EN_PROGRESO", "CANCELADO"],
    ["CANCELADO", "NUEVO"],
  ])("%s ↛ %s", (from, to) => {
    expect(canTransitionTicket(from, to)).toBe(false);
  });
});
