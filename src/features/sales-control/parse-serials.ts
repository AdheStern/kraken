// src/features/sales-control/parse-serials.ts
// Parte en una lista los seriales escritos o pegados (uno por renglón; también comas, punto y coma o tabuladores
// de Excel), sin espacios ni vacíos. La usan la celda de la grilla, el panel de detalle, el pegado y el leasing.

const SEPARATOR = /[\r\n\t,;]+/;

export function parseSerials(text: string): string[] {
  return text
    .split(SEPARATOR)
    .map((serial) => serial.trim())
    .filter(Boolean);
}
