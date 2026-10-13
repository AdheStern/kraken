// src/domain/sales-control/cv-code.ts
// Código visible de un CV: {correlativo}{ciudad}-{aa} (AGENTS.md §2.1), p. ej. 132LP-25 o 015SC-26.

// [CONFIRMAR] relleno mínimo del correlativo; los CV históricos traen 3 y 4 dígitos.
export const CV_NUMBER_MIN_DIGITS = 3;

type CvCodeParts = {
  number: number;
  cityCode: string;
  year: number;
};

export function toCvCode({ number, cityCode, year }: CvCodeParts): string {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError(`Correlativo inválido: ${number}`);
  }
  const correlative = String(number).padStart(CV_NUMBER_MIN_DIGITS, "0");
  const shortYear = String(year % 100).padStart(2, "0");
  return `${correlative}${cityCode}-${shortYear}`;
}

// REGLA: las versiones no cambian el número; la v1 se muestra sin sufijo (§2.1).
export function toCvVersionLabel(code: string, versionNumber: number): string {
  return versionNumber > 1 ? `${code} v${versionNumber}` : code;
}
