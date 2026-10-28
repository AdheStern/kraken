// src/domain/tickets/summarize-ticket-work.ts
// Resumen del trabajo de un ticket: minutos reales por persona y por subtarea, y minutos descontados por bolsa
// (neto de reversos). Los reales se cuentan como en la pestaña Registros (AGENTS.md §2.6).

export type WorkEntry = {
  personId: string;
  subtaskId: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

// REGLA: CONSUMO con signo − y REVERSO con signo +; lo descontado es el neto, en positivo (§2.4 libro mayor).
export type TicketMovement = { bagId: string; minutes: number };

export type TicketWorkSummary = {
  realMinutes: number;
  chargedMinutes: number;
  byPerson: Map<string, { minutes: number; entries: number }>;
  bySubtask: Map<string | null, number>;
  byBag: Map<string, number>;
};

const MINUTE_MS = 60_000;

export function entryMinutes(
  entry: Pick<WorkEntry, "startedAt" | "endedAt">,
): number {
  if (!entry.endedAt) return 0;
  return Math.ceil(
    (entry.endedAt.getTime() - entry.startedAt.getTime()) / MINUTE_MS,
  );
}

export function summarizeTicketWork(
  entries: readonly WorkEntry[],
  movements: readonly TicketMovement[],
): TicketWorkSummary {
  const byPerson = new Map<string, { minutes: number; entries: number }>();
  const bySubtask = new Map<string | null, number>();
  let realMinutes = 0;
  for (const entry of entries) {
    const minutes = entryMinutes(entry);
    realMinutes += minutes;
    const person = byPerson.get(entry.personId) ?? { minutes: 0, entries: 0 };
    byPerson.set(entry.personId, {
      minutes: person.minutes + minutes,
      entries: person.entries + 1,
    });
    bySubtask.set(
      entry.subtaskId,
      (bySubtask.get(entry.subtaskId) ?? 0) + minutes,
    );
  }
  const byBag = new Map<string, number>();
  for (const m of movements)
    byBag.set(m.bagId, (byBag.get(m.bagId) ?? 0) - m.minutes);
  for (const [bagId, minutes] of byBag) if (minutes === 0) byBag.delete(bagId);
  const chargedMinutes = [...byBag.values()].reduce((a, b) => a + b, 0);
  return { realMinutes, chargedMinutes, byPerson, bySubtask, byBag };
}
