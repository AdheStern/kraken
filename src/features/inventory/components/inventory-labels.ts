// src/features/inventory/components/inventory-labels.ts
// Nombres en la interfaz de los movimientos de inventario y presentación de cantidades (AGENTS.md §2.8).
import type { InvMovementKind, ReceiptOrigin } from "@/generated/prisma/enums";
import { formatAmount } from "@/lib/format-amount";

export const MOVEMENT_KIND_LABELS: Record<InvMovementKind, string> = {
  INGRESO: "Ingreso",
  SALIDA: "Salida",
  TRASPASO: "Traspaso",
  AJUSTE: "Ajuste",
  DEVOLUCION: "Devolución",
};

export const RECEIPT_ORIGIN_LABELS: Record<ReceiptOrigin, string> = {
  COMPRA_LOCAL: "compra local",
  IMPORTACION: "importación",
  INVENTARIO_INICIAL: "inventario inicial",
};

// POR QUÉ: casi todo se cuenta en unidades enteras; los decimales solo aparecen cuando existen (metros, rollos).
export function formatQuantity(value: string): string {
  const text = formatAmount(value);
  return text.endsWith(".00") ? text.slice(0, -3) : text;
}
