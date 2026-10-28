// src/domain/hours/closing-minutes.ts
// Minutos del movimiento que cierra o vence una bolsa: lo que le queda de saldo, en negativo. Un contrato sin
// tope no tiene saldo que devolver; su saldo es lo usado y se conserva (AGENTS.md §2.4).

export type ClosableBag = { balanceMinutes: number; isUncapped: boolean };

// TRAMPA: 0 − saldo y no −saldo, que con saldo 0 daría −0.
export function closingMinutes({
  balanceMinutes,
  isUncapped,
}: ClosableBag): number {
  return isUncapped ? 0 : 0 - balanceMinutes;
}
