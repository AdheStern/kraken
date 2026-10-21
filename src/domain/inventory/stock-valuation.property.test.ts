// src/domain/inventory/stock-valuation.property.test.ts
// Propiedades del libro valorizado (AGENTS.md §11): el valor nunca es negativo, sacar todo deja valor 0, la suma
// de las líneas es el valor del stock y las porciones de un valor fijo suman el total.
import Decimal from "decimal.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  applyInbound,
  applyOutbound,
  proportionalValue,
  type StockBalance,
} from "./stock-valuation";

const cents = (max: number) =>
  fc.integer({ min: 0, max }).map((n) => new Decimal(n).div(100));
const quantityArb = fc
  .integer({ min: 1, max: 5000 })
  .map((n) => new Decimal(n).div(100));

// Una entrada (cantidad, valor) o una salida (fracción del stock en milésimas).
type Operation =
  | { kind: "IN"; quantity: Decimal; value: Decimal }
  | { kind: "OUT"; share: number };

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({
    kind: fc.constant("IN" as const),
    quantity: quantityArb,
    value: cents(10_000_00),
  }),
  fc.record({
    kind: fc.constant("OUT" as const),
    share: fc.integer({ min: 1, max: 1000 }),
  }),
);

function run(operations: readonly Operation[]) {
  let balance: StockBalance = {
    quantity: new Decimal(0),
    valueUsd: new Decimal(0),
  };
  let ledgerValue = new Decimal(0);
  let ledgerQuantity = new Decimal(0);
  for (const operation of operations) {
    const entry =
      operation.kind === "IN"
        ? applyInbound(balance, operation.quantity, operation.value)
        : outbound(balance, operation.share);
    if (!entry) continue;
    expect(entry.balance.valueUsd.isNegative()).toBe(false);
    ledgerValue = ledgerValue.plus(entry.valueUsd);
    ledgerQuantity = ledgerQuantity.plus(entry.quantity);
    balance = entry.balance;
  }
  return { balance, ledgerValue, ledgerQuantity };
}

function outbound(balance: StockBalance, share: number) {
  const quantity = balance.quantity
    .mul(share)
    .div(1000)
    .toDecimalPlaces(2, Decimal.ROUND_DOWN);
  return quantity.isZero() ? null : applyOutbound(balance, quantity);
}

describe("libro valorizado (propiedades)", () => {
  it("el valor nunca es negativo y el libro reproduce la caché", () => {
    fc.assert(
      fc.property(fc.array(operationArb, { maxLength: 30 }), (operations) => {
        const { balance, ledgerValue, ledgerQuantity } = run(operations);
        expect(ledgerValue.equals(balance.valueUsd)).toBe(true);
        expect(ledgerQuantity.equals(balance.quantity)).toBe(true);
      }),
    );
  });

  it("sacar todo el stock deja valor 0", () => {
    fc.assert(
      fc.property(fc.array(operationArb, { maxLength: 30 }), (operations) => {
        const { balance } = run(operations);
        const emptied = balance.quantity.isZero()
          ? balance
          : applyOutbound(balance, balance.quantity).balance;
        expect(emptied.valueUsd.isZero()).toBe(true);
      }),
    );
  });

  it("las porciones de un valor fijo suman el total y ninguna es negativa", () => {
    fc.assert(
      fc.property(
        cents(1_000_000_00),
        fc.array(quantityArb, { minLength: 1, maxLength: 8 }),
        (total, parts) => {
          const totalQuantity = parts.reduce((a, b) => a.plus(b));
          let taken = new Decimal(0);
          let sum = new Decimal(0);
          for (const part of parts) {
            const portion = proportionalValue(
              total,
              totalQuantity,
              part,
              taken,
            );
            expect(portion.isNegative()).toBe(false);
            sum = sum.plus(portion);
            taken = taken.plus(part);
          }
          expect(sum.equals(total)).toBe(true);
        },
      ),
    );
  });
});
