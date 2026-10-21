// src/domain/inventory/stock-valuation.ts
// Costo promedio ponderado llevado como cantidad + valor total por almacén y producto [CONFIRMAR] (AGENTS.md
// §2.8): entradas, salidas al promedio y porciones de un valor fijo (traspasos, devoluciones), half-up §15.4.
import type Decimal from "decimal.js";
import { roundHalfUp2 } from "@/domain/pricing/money";

export type StockBalance = { quantity: Decimal; valueUsd: Decimal };

// Cantidad y valor con signo (+ entra, − sale) y el saldo tras aplicarlos: una fila del kardex.
export type ValuedEntry = {
  quantity: Decimal;
  valueUsd: Decimal;
  balance: StockBalance;
};

export function applyInbound(
  balance: StockBalance,
  quantity: Decimal,
  valueUsd: Decimal,
): ValuedEntry {
  assertQuantity(quantity);
  if (valueUsd.isNegative() || valueUsd.decimalPlaces() > 2)
    throw new RangeError("El valor de una entrada es ≥ 0 con 2 decimales.");
  return {
    quantity,
    valueUsd,
    balance: {
      quantity: balance.quantity.plus(quantity),
      valueUsd: balance.valueUsd.plus(valueUsd),
    },
  };
}

// REGLA: la salida vale al promedio y, si se lleva todo el stock, todo su valor: no quedan centavos huérfanos.
export function applyOutbound(
  balance: StockBalance,
  quantity: Decimal,
): ValuedEntry {
  assertQuantity(quantity);
  if (quantity.greaterThan(balance.quantity))
    throw new RangeError("La salida supera el stock.");
  const valueUsd = quantity.equals(balance.quantity)
    ? balance.valueUsd
    : valueAtAverage(balance, quantity);
  return outboundEntry(balance, quantity, valueUsd);
}

// POR QUÉ: lo que sale de TRANSITO vale lo que su traspaso envió (proportionalValue), no el promedio del almacén
// lógico, que mezcla traspasos de orígenes con costos distintos (§2.8).
export function applyOutboundAtValue(
  balance: StockBalance,
  quantity: Decimal,
  valueUsd: Decimal,
): ValuedEntry {
  assertQuantity(quantity);
  if (quantity.greaterThan(balance.quantity))
    throw new RangeError("La salida supera el stock.");
  const leavesAll = quantity.equals(balance.quantity);
  if (
    valueUsd.isNegative() ||
    valueUsd.greaterThan(balance.valueUsd) ||
    (leavesAll && !valueUsd.equals(balance.valueUsd))
  )
    throw new RangeError("El valor de la salida no cuadra con el del stock.");
  return outboundEntry(balance, quantity, valueUsd);
}

function outboundEntry(
  balance: StockBalance,
  quantity: Decimal,
  valueUsd: Decimal,
): ValuedEntry {
  return {
    quantity: quantity.negated(),
    valueUsd: valueUsd.negated(),
    balance: {
      quantity: balance.quantity.minus(quantity),
      valueUsd: balance.valueUsd.minus(valueUsd),
    },
  };
}

// Valor de q unidades al promedio vigente; sirve también para un ajuste positivo con stock.
export function valueAtAverage(
  balance: StockBalance,
  quantity: Decimal,
): Decimal {
  if (balance.quantity.isZero())
    throw new RangeError("Sin stock no hay promedio.");
  return roundHalfUp2(balance.valueUsd.mul(quantity).div(balance.quantity));
}

// POR QUÉ: cada porción es la diferencia de dos acumulados redondeados; las porciones suman exactamente el total
// sin importar en cuántas partes llegue (recepciones parciales, devoluciones parciales).
export function proportionalValue(
  totalValueUsd: Decimal,
  totalQuantity: Decimal,
  quantity: Decimal,
  alreadyTakenQuantity: Decimal,
): Decimal {
  assertQuantity(quantity);
  const takenAfter = alreadyTakenQuantity.plus(quantity);
  if (
    alreadyTakenQuantity.isNegative() ||
    takenAfter.greaterThan(totalQuantity)
  )
    throw new RangeError("La porción supera la cantidad original.");
  const cumulative = (taken: Decimal) =>
    roundHalfUp2(totalValueUsd.mul(taken).div(totalQuantity));
  return cumulative(takenAfter).minus(cumulative(alreadyTakenQuantity));
}

// Costo unitario para mostrar (valor ÷ cantidad); null sin stock.
export function averageUnitCostUsd(balance: StockBalance): Decimal | null {
  if (balance.quantity.isZero()) return null;
  return roundHalfUp2(balance.valueUsd.div(balance.quantity));
}

function assertQuantity(quantity: Decimal): void {
  if (quantity.lessThanOrEqualTo(0) || quantity.decimalPlaces() > 2)
    throw new RangeError("La cantidad es > 0 con hasta 2 decimales.");
}
