// src/lib/format-minutes.ts
// Presenta minutos enteros como horas y minutos ("12 h 30 min"); el tiempo se guarda siempre en minutos (regla 4).

// TRAMPA: es-BO agrupa miles con punto y "10.083 h" se lee como horas con decimales; se agrupa con coma, igual
// que los montos (formatAmount).
const hoursFormat = new Intl.NumberFormat("en-US");

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "−" : "";
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${sign}${rest} min`;
  const hoursText = `${sign}${hoursFormat.format(hours)} h`;
  return rest === 0 ? hoursText : `${hoursText} ${rest} min`;
}
