// src/server/hours/hour-errors.ts
// Errores del libro de horas que las actions traducen a ActionResult (INSUFFICIENT_BALANCE, INVALID_STATE).

export class InsufficientBalanceError extends Error {
  constructor(
    readonly bagId: string,
    readonly balanceMinutes: number,
    readonly requestedMinutes: number,
  ) {
    super(
      `Saldo insuficiente en la bolsa ${bagId}: quedan ${balanceMinutes} min y se piden ${requestedMinutes}.`,
    );
    this.name = "InsufficientBalanceError";
  }
}

export class BagStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BagStateError";
  }
}

// POR QUÉ: al aprobar, un plan de bolsas inviable debe revertir toda la transacción (decisión incluida);
// devolver un ActionResult la confirmaría, por eso se lanza.
export class BagPlanError extends Error {
  constructor(
    readonly code: "VALIDATION" | "INVALID_STATE" | "INSUFFICIENT_BALANCE",
    message: string,
  ) {
    super(message);
    this.name = "BagPlanError";
  }
}
