// src/domain/tickets/project-schedule.ts
// Avance de un proyecto por sus fechas: día en curso sobre la duración total, o si aún no empieza o ya venció
// (AGENTS.md §2.6). Fechas civiles "yyyy-MM-dd" del calendario de negocio (regla 5).

export type ProjectSchedule =
  | { kind: "SIN_FECHAS" }
  | { kind: "POR_EMPEZAR"; daysToStart: number }
  | { kind: "EN_CURSO"; day: number; totalDays: number | null }
  | { kind: "VENCIDO"; daysOverdue: number };

const DAY_MS = 86_400_000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

// POR QUÉ: los días se cuentan inclusivos; un proyecto del 1 al 10 dura 10 días y el 1 es el día 1.
export function computeProjectSchedule(
  startsOn: string | null,
  endsOn: string | null,
  today: string,
): ProjectSchedule {
  const now = toDay(today);
  if (startsOn && now < toDay(startsOn))
    return { kind: "POR_EMPEZAR", daysToStart: toDay(startsOn) - now };
  if (endsOn && now > toDay(endsOn))
    return { kind: "VENCIDO", daysOverdue: now - toDay(endsOn) };
  if (!startsOn) return { kind: "SIN_FECHAS" };
  return {
    kind: "EN_CURSO",
    day: now - toDay(startsOn) + 1,
    totalDays: endsOn ? toDay(endsOn) - toDay(startsOn) + 1 : null,
  };
}
