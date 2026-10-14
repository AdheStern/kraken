// src/features/calendar/types.ts
// Tipos de presentación de los catálogos de horario de oficina y feriados (horas como "HH:MM").

export type SlotView = { weekday: number; start: string; end: string };

export type ScheduleView = {
  id: string;
  name: string;
  slots: SlotView[];
  cityCodes: string[];
};

export type CityScheduleView = {
  id: string;
  code: string;
  name: string;
  scheduleId: string | null;
};

export type HolidayView = {
  id: string;
  date: string;
  name: string;
  cityId: string | null;
  cityCode: string | null;
};

export type CalendarAdminData = {
  year: number;
  schedules: ScheduleView[];
  cities: CityScheduleView[];
  holidays: HolidayView[];
};
