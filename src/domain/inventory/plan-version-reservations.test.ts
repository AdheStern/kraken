// src/domain/inventory/plan-version-reservations.test.ts
// Reservas por versión (AGENTS.md §2.3, §2.8): linaje, cambio de producto, línea quitada y recorte a lo ya
// despachado, que al enviar bloquea y al aprobar solo avisa.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  type CurrentReservation,
  planVersionReservations,
  type ReservationPlan,
  type VersionStockLine,
} from "./plan-version-reservations";

const d = (value: number) => new Decimal(value);

const line = (
  lineId: string,
  quantity: number,
  originLineId: string | null = null,
  productId = "switch",
): VersionStockLine => ({
  lineId,
  originLineId,
  productId,
  quantity: d(quantity),
});

const reservation = (
  rootLineId: string,
  quantity: number,
  consumed = 0,
  productId = "switch",
): CurrentReservation => ({
  reservationId: `r-${rootLineId}`,
  rootLineId,
  productId,
  quantity: d(quantity),
  consumedQuantity: d(consumed),
});

// Decimal a número para comparar el plan sin depender de la representación interna.
const plain = (plan: ReservationPlan) => toNumbers(plan);

function toNumbers(value: unknown): unknown {
  if (value instanceof Decimal) return value.toNumber();
  if (Array.isArray(value)) return value.map(toNumbers);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, toNumbers(inner)]),
  );
}

describe("planVersionReservations", () => {
  it("la primera versión crea una reserva por línea con la propia línea como raíz", () => {
    expect(plain(planVersionReservations([line("l1", 3)], []))).toEqual({
      ops: [
        {
          kind: "CREATE",
          lineId: "l1",
          rootLineId: "l1",
          productId: "switch",
          quantity: 3,
        },
      ],
      issues: [],
    });
  });

  it("una versión nueva ajusta por la diferencia o solo vuelve a enlazar", () => {
    const plan = planVersionReservations(
      [line("l2", 5, "l1"), line("m2", 2, "m1")],
      [reservation("l1", 3), reservation("m1", 2)],
    );
    expect((plain(plan) as { ops: unknown }).ops).toEqual([
      { kind: "ADJUST", reservationId: "r-l1", lineId: "l2", deltaQuantity: 2 },
      { kind: "RELINK", reservationId: "r-m1", lineId: "m2" },
    ]);
  });

  it("la línea quitada libera su reserva; con despachos avisa", () => {
    const plan = planVersionReservations(
      [],
      [reservation("l1", 3), reservation("m1", 2, 1)],
    );
    expect(plain(plan)).toEqual({
      ops: [
        { kind: "RELEASE", reservationId: "r-l1" },
        { kind: "RELEASE", reservationId: "r-m1" },
      ],
      issues: [
        {
          kind: "DROPPED_WITH_DISPATCH",
          lineId: null,
          reservationId: "r-m1",
          dispatched: 1,
        },
      ],
    });
  });

  it("si cambia el producto, libera la anterior antes de crear la nueva", () => {
    const plan = planVersionReservations(
      [line("l2", 1, "l1", "router")],
      [reservation("l1", 1)],
    );
    expect(plain(plan)).toEqual({
      ops: [
        { kind: "RELEASE", reservationId: "r-l1" },
        {
          kind: "CREATE",
          lineId: "l2",
          rootLineId: "l1",
          productId: "router",
          quantity: 1,
        },
      ],
      issues: [],
    });
  });

  it("no baja de lo despachado: recorta y lo reporta", () => {
    const plan = planVersionReservations(
      [line("l2", 1, "l1")],
      [reservation("l1", 4, 3)],
    );
    expect(plain(plan)).toEqual({
      ops: [
        {
          kind: "ADJUST",
          reservationId: "r-l1",
          lineId: "l2",
          deltaQuantity: -1,
        },
      ],
      issues: [
        {
          kind: "BELOW_DISPATCHED",
          lineId: "l2",
          reservationId: "r-l1",
          requested: 1,
          dispatched: 3,
        },
      ],
    });
  });

  it("una línea en 0 sin despachos libera; una nueva en 0 no reserva", () => {
    const plan = planVersionReservations(
      [line("l2", 0, "l1"), line("n1", 0)],
      [reservation("l1", 2)],
    );
    expect(plain(plan)).toEqual({
      ops: [{ kind: "RELEASE", reservationId: "r-l1" }],
      issues: [],
    });
  });

  it("rechaza cantidades negativas o con más de 2 decimales", () => {
    expect(() => planVersionReservations([line("l1", -1)], [])).toThrow(
      RangeError,
    );
    const fine: VersionStockLine = {
      ...line("l1", 1),
      quantity: new Decimal("1.005"),
    };
    expect(() => planVersionReservations([fine], [])).toThrow(RangeError);
  });
});
