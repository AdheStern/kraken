// src/domain/inventory/transfer-state-machine.ts
// Estados de un traspaso y sus transiciones permitidas (AGENTS.md §8). La interfaz muestra solo estas;
// el servidor vuelve a validarlas.

export type TransferStatus =
  | "BORRADOR"
  | "EN_TRANSITO"
  | "RECIBIDO"
  | "RECIBIDO_CON_DIFERENCIAS"
  | "CANCELADO";

// REGLA: lo no recibido queda en TRANSITO; cuando llega o se da de baja con un ajuste, el traspaso pasa
// de RECIBIDO_CON_DIFERENCIAS a RECIBIDO (§2.8).
const TRANSITIONS: Readonly<Record<TransferStatus, readonly TransferStatus[]>> =
  {
    BORRADOR: ["EN_TRANSITO", "CANCELADO"],
    EN_TRANSITO: ["RECIBIDO", "RECIBIDO_CON_DIFERENCIAS"],
    RECIBIDO_CON_DIFERENCIAS: ["RECIBIDO"],
    RECIBIDO: [],
    CANCELADO: [],
  };

export function canTransitionTransfer(
  from: TransferStatus,
  to: TransferStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

// Recepciones y bajas solo mientras quede algo en camino.
export function acceptsSettlement(status: TransferStatus): boolean {
  return status === "EN_TRANSITO" || status === "RECIBIDO_CON_DIFERENCIAS";
}
