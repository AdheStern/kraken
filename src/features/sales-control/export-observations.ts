// src/features/sales-control/export-observations.ts
// Texto de la columna Observaciones del Excel: la observación de la línea, su rango de activación y sus
// seriales, uno por renglón. La plantilla PA-PR-03-RE-01 no tiene columna propia para los dos últimos.

type LineObservations = {
  notes: string | null;
  activationStart: Date | null;
  activationEnd: Date | null;
  serials: string[];
};

export function exportObservations(line: LineObservations): string {
  const activation =
    line.activationStart && line.activationEnd
      ? `Activación: ${toDayText(line.activationStart)} – ${toDayText(line.activationEnd)}`
      : "";
  const serials =
    line.serials.length > 0 ? `S/N: ${line.serials.join(", ")}` : "";
  return [line.notes ?? "", activation, serials].filter(Boolean).join("\n");
}

// TRAMPA: una columna DATE llega como medianoche UTC; se lee en UTC para no correr el día.
function toDayText(date: Date): string {
  return date.toISOString().slice(0, 10).split("-").reverse().join("/");
}
