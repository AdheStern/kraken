// src/lib/local-date-text.ts
// Conversión entre el texto "YYYY-MM-DD" de los formularios y la fecha del calendario en hora local.
// TRAMPA: "2026-10-15" con new Date() es medianoche UTC y en La Paz cae el día anterior; se arma en hora local.

export function parseLocalDateText(text: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toLocalDateText(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
