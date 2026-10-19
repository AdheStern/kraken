// src/features/tickets/components/ticket-dates.ts
// Fechas y horas de los tickets en el calendario de La Paz (AGENTS.md regla 5, ADR-15).

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}
