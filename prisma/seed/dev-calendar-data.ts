// prisma/seed/dev-calendar-data.ts
// Calendario de DESARROLLO: horario de oficina de ejemplo y feriados de Bolivia 2026–2027 (AGENTS.md §2.5).
// [CONFIRMAR] horario real por ciudad (¿pausa de mediodía?) y feriados departamentales y de traslado (§14, F2).

// Horario de HORAS-01: lunes a viernes 08:30–18:30 (minutos desde la medianoche en La Paz).
export const OFFICE_SCHEDULE = {
  name: "Oficina estándar",
  slots: [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startMinute: 510,
    endMinute: 1110,
  })),
  cityCodes: ["LP", "SC", "CB"],
};

// POR QUÉ: fechas nominales; los traslados por decreto (p. ej. domingo → lunes) los carga el administrador.
export const NATIONAL_HOLIDAYS = [
  { date: "2026-01-01", name: "Año Nuevo" },
  { date: "2026-01-22", name: "Día del Estado Plurinacional" },
  { date: "2026-02-16", name: "Carnaval" },
  { date: "2026-02-17", name: "Carnaval" },
  { date: "2026-04-03", name: "Viernes Santo" },
  { date: "2026-05-01", name: "Día del Trabajo" },
  { date: "2026-06-04", name: "Corpus Christi" },
  { date: "2026-06-21", name: "Año Nuevo Andino Amazónico" },
  { date: "2026-08-06", name: "Día de la Independencia" },
  { date: "2026-11-02", name: "Todos Santos" },
  { date: "2026-12-25", name: "Navidad" },
  { date: "2027-01-01", name: "Año Nuevo" },
  { date: "2027-01-22", name: "Día del Estado Plurinacional" },
  { date: "2027-02-08", name: "Carnaval" },
  { date: "2027-02-09", name: "Carnaval" },
  { date: "2027-03-26", name: "Viernes Santo" },
  { date: "2027-05-01", name: "Día del Trabajo" },
  { date: "2027-05-27", name: "Corpus Christi" },
  { date: "2027-06-21", name: "Año Nuevo Andino Amazónico" },
  { date: "2027-08-06", name: "Día de la Independencia" },
  { date: "2027-11-02", name: "Todos Santos" },
  { date: "2027-12-25", name: "Navidad" },
];

export const DEPARTMENTAL_HOLIDAYS = [
  { cityCode: "LP", monthDay: "07-16", name: "Aniversario de La Paz" },
  { cityCode: "CB", monthDay: "09-14", name: "Aniversario de Cochabamba" },
  { cityCode: "SC", monthDay: "09-24", name: "Aniversario de Santa Cruz" },
].flatMap(({ cityCode, monthDay, name }) =>
  [2026, 2027].map((year) => ({ cityCode, date: `${year}-${monthDay}`, name })),
);
