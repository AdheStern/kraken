// src/lib/format-minutes.ts
// Presenta minutos enteros como horas y minutos ("12 h 30 min"); el tiempo se guarda siempre en minutos (regla 4).

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "−" : "";
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${sign}${rest} min`;
  const hoursText = `${sign}${hours.toLocaleString("es-BO")} h`;
  return rest === 0 ? hoursText : `${hoursText} ${rest} min`;
}
