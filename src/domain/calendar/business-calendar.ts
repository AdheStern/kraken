// src/domain/calendar/business-calendar.ts
// Calendario de negocio de una ciudad: franjas de oficina por día de la semana y feriados (AGENTS.md §2.5).

// REGLA: minutos desde la medianoche en America/La_Paz; weekday ISO 1 = lunes … 7 = domingo; endMinute ≤ 1440.
export type ScheduleSlot = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

// TRAMPA: los feriados son los nacionales más los de la ciudad del ticket, no la del ingeniero (§2.5).
// Se expresan como fechas civiles "yyyy-MM-dd" de La Paz.
export type BusinessCalendar = {
  slots: readonly ScheduleSlot[];
  holidays: ReadonlySet<string>;
};
