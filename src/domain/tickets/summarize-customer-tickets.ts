// src/domain/tickets/summarize-customer-tickets.ts
// Resumen del inicio del portal de clientes: tickets abiertos, cerrados en el mes de negocio y horas
// descontadas en ese mes (AGENTS.md §2.11). El mes se calcula en America/La_Paz (ADR-15).
import { toBusinessDate } from "@/domain/calendar/business-date";

type CustomerTicketFacts = {
  status: string;
  closedAt: Date | null;
  chargedMinutes: number;
};

export type CustomerTicketSummary = {
  openCount: number;
  closedThisMonth: number;
  chargedMinutesThisMonth: number;
};

const FINISHED = new Set(["CERRADO", "CANCELADO"]);

export function summarizeCustomerTickets(
  tickets: readonly CustomerTicketFacts[],
  now: Date,
): CustomerTicketSummary {
  const month = toBusinessDate(now).slice(0, 7);
  const closed = tickets.filter(
    (t) =>
      t.status === "CERRADO" &&
      t.closedAt !== null &&
      toBusinessDate(t.closedAt).slice(0, 7) === month,
  );
  return {
    openCount: tickets.filter((t) => !FINISHED.has(t.status)).length,
    closedThisMonth: closed.length,
    chargedMinutesThisMonth: closed.reduce(
      (sum, t) => sum + t.chargedMinutes,
      0,
    ),
  };
}
