// src/features/inventory/components/receipt-draft.ts
// Las filas del ingreso cuando se cargan tocando mosaicos: una por código, que se agrega, se reemplaza o se quita.
// Son las mismas filas de la pestaña de Excel, así que las valida parseReceiptRows (AGENTS.md §2.8, §9 DRY).
import type { ReceiptDraftRow } from "@/domain/inventory/parse-receipt-rows";

export const EMPTY_ROW: ReceiptDraftRow = {
  code: "",
  description: "",
  quantity: "",
  unitCostUsd: "",
  serials: "",
};

export function isEmptyRow(row: ReceiptDraftRow): boolean {
  return Object.values(row).every((value) => value.trim() === "");
}

export function sameCode(row: ReceiptDraftRow, code: string): boolean {
  return row.code.trim().toUpperCase() === code.trim().toUpperCase();
}

// POR QUÉ: el mismo código se carga una vez; volver a tocarlo edita su fila. Ocupa la primera fila vacía para que
// la pestaña de Excel no muestre huecos.
export function upsertReceiptRow(
  rows: readonly ReceiptDraftRow[],
  row: ReceiptDraftRow,
): ReceiptDraftRow[] {
  const index = rows.findIndex((r) => sameCode(r, row.code));
  const target = index >= 0 ? index : rows.findIndex(isEmptyRow);
  if (target < 0) return [...rows, row];
  return rows.map((r, i) => (i === target ? row : r));
}

export function removeReceiptRow(
  rows: readonly ReceiptDraftRow[],
  code: string,
): ReceiptDraftRow[] {
  const rest = rows.filter((r) => !sameCode(r, code));
  return rest.length > 0 ? rest : [EMPTY_ROW];
}

// REGLA: un serial no se repite en el ingreso (parseReceiptRows); la cámara lee el mismo código muchas veces.
export function appendSerial(
  serials: string,
  serial: string,
): { serials: string; added: boolean } {
  const value = serial.trim();
  const current = serials.split(/[\s,;]+/).filter(Boolean);
  if (!value || current.some((s) => s.toUpperCase() === value.toUpperCase()))
    return { serials, added: false };
  return { serials: [...current, value].join("\n"), added: true };
}
