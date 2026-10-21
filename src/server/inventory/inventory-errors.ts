// src/server/inventory/inventory-errors.ts
// Errores del libro de inventario que las actions traducen a ActionResult (INSUFFICIENT_STOCK, INVALID_STATE).

export class InsufficientStockError extends Error {
  constructor(
    readonly productCode: string,
    readonly availableQuantity: string,
  ) {
    super(
      `Stock insuficiente de ${productCode}: hay ${availableQuantity} disponibles.`,
    );
    this.name = "InsufficientStockError";
  }
}

// POR QUÉ: un serial ya despachado, un traspaso que ya no está en tránsito o una devolución que supera lo
// despachado se detectan con el stock bloqueado; se lanza para revertir lo que la transacción ya escribió.
export class InventoryStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryStateError";
  }
}
