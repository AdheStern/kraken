// src/domain/inventory/transfer-pending.ts
// Lo que cada línea de un traspaso aún tiene en TRANSITO y el estado que corresponde tras recibir o dar de
// baja (AGENTS.md §2.8, §8).
import type Decimal from "decimal.js";

export type TransferLineProgress = {
  quantitySent: Decimal;
  receivedQuantity: Decimal;
  writtenOffQuantity: Decimal;
};

export function pendingQuantity(line: TransferLineProgress): Decimal {
  const pending = line.quantitySent
    .minus(line.receivedQuantity)
    .minus(line.writtenOffQuantity);
  if (pending.isNegative())
    throw new RangeError("Lo recibido y dado de baja supera lo enviado.");
  return pending;
}

export function settledTransferStatus(
  lines: readonly TransferLineProgress[],
): "RECIBIDO" | "RECIBIDO_CON_DIFERENCIAS" {
  return lines.every((line) => pendingQuantity(line).isZero())
    ? "RECIBIDO"
    : "RECIBIDO_CON_DIFERENCIAS";
}

// Cantidad a recibir de una línea: positiva y sin superar lo pendiente; los seriales llegan de a uno.
export function validateReceipt(
  line: TransferLineProgress & { isSerial: boolean },
  quantity: Decimal,
): string | null {
  if (quantity.lessThanOrEqualTo(0) || quantity.decimalPlaces() > 2)
    return "La cantidad recibida es mayor a 0 con hasta 2 decimales.";
  if (line.isSerial && !quantity.equals(1))
    return "Un serial se recibe de a una unidad.";
  if (quantity.greaterThan(pendingQuantity(line)))
    return "Se recibe más de lo que queda en tránsito.";
  return null;
}
