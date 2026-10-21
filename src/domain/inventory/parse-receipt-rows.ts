// src/domain/inventory/parse-receipt-rows.ts
// Filas de un ingreso tal como se escriben o se pegan desde Excel (código, descripción, cantidad, costo unitario
// USD, seriales) validadas y normalizadas. La usan la grilla y el servidor (AGENTS.md §2.8, §9 DRY).
import Decimal from "decimal.js";
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";
import { parseTsv } from "@/domain/sales-control/parse-tsv";

export type ReceiptDraftRow = {
  code: string;
  description: string;
  quantity: string;
  unitCostUsd: string;
  serials: string;
};

export type ReceiptLine = {
  code: string;
  description: string;
  quantity: Decimal;
  unitCostUsd: Decimal;
  serials: string[];
};

export type ReceiptRowIssue = { row: number; message: string };

const COLUMNS = [
  "code",
  "description",
  "quantity",
  "unitCostUsd",
  "serials",
] as const;

// POR QUÉ: la primera fila de una planilla suele ser el encabezado; se reconoce por la palabra "código".
export function toReceiptDraftRows(text: string): ReceiptDraftRow[] {
  const rows = parseTsv(text);
  const start = /c[oó]digo/i.test(rows[0]?.[0] ?? "") ? 1 : 0;
  return rows
    .slice(start)
    .map(
      (cells) =>
        Object.fromEntries(
          COLUMNS.map((column, i) => [column, cells[i] ?? ""]),
        ) as ReceiptDraftRow,
    );
}

// REGLA: el costo es obligatorio y admite 0 (decisión de DIMA, 2026-10-21); los seriales, si van, son tantos
// como la cantidad y no se repiten en el ingreso.
export function parseReceiptRows(rows: readonly ReceiptDraftRow[]): {
  lines: ReceiptLine[];
  issues: ReceiptRowIssue[];
} {
  const lines: ReceiptLine[] = [];
  const issues: ReceiptRowIssue[] = [];
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (Object.values(row).every((value) => value.trim() === "")) continue;
    const parsed = parseRow(row);
    const repeated =
      typeof parsed === "string"
        ? undefined
        : parsed.serials.find((s) => seen.has(`${parsed.code}:${s}`));
    if (typeof parsed === "string" || repeated) {
      const message =
        typeof parsed === "string"
          ? parsed
          : `El serial ${repeated} está repetido en el ingreso.`;
      issues.push({ row: index + 1, message });
      continue;
    }
    for (const serial of parsed.serials) seen.add(`${parsed.code}:${serial}`);
    lines.push(parsed);
  }
  if (lines.length === 0 && issues.length === 0)
    issues.push({ row: 0, message: "Agrega al menos una línea." });
  return { lines, issues };
}

function parseRow(row: ReceiptDraftRow): ReceiptLine | string {
  const code = row.code.trim().toUpperCase();
  if (!code) return "Falta el código del producto.";
  const quantityText = parseDecimalText(row.quantity);
  if (quantityText === null) return `La cantidad de ${code} no es un número.`;
  const quantity = new Decimal(quantityText);
  if (quantity.lessThanOrEqualTo(0) || quantity.decimalPlaces() > 2)
    return `La cantidad de ${code} es mayor a 0 con hasta 2 decimales.`;
  const costText = parseDecimalText(row.unitCostUsd);
  if (costText === null)
    return `Escribe el costo unitario en USD de ${code} (0 si no tiene).`;
  const unitCostUsd = new Decimal(costText);
  if (unitCostUsd.isNegative() || unitCostUsd.decimalPlaces() > 2)
    return `El costo de ${code} es 0 o más, con hasta 2 decimales.`;
  const serials = [...new Set(row.serials.split(/[\s,;]+/).filter(Boolean))];
  if (serials.length > 0 && !quantity.equals(serials.length))
    return `${code}: ${serials.length} seriales para ${quantity.toString()} unidades; deben coincidir.`;
  return {
    code,
    description: row.description.trim(),
    quantity,
    unitCostUsd,
    serials,
  };
}
