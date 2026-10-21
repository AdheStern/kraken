// src/domain/inventory/plan-version-reservations.ts
// Decide qué pasa con las reservas de stock de un CV al aprobarse una versión: crear, ajustar, volver a enlazar
// o liberar, emparejando por linaje como las bolsas (AGENTS.md §2.3, §2.8).
import Decimal from "decimal.js";

// TRAMPA: originLineId es la raíz del linaje; en la primera versión es null y la raíz es la propia línea.
export type VersionStockLine = {
  lineId: string;
  originLineId: string | null;
  productId: string;
  quantity: Decimal;
};

// La reserva vigente de un linaje (ACTIVA o CONSUMIDA); las LIBERADA ya no cuentan.
export type CurrentReservation = {
  reservationId: string;
  rootLineId: string;
  productId: string;
  quantity: Decimal;
  consumedQuantity: Decimal;
};

export type ReservationOp =
  | {
      kind: "CREATE";
      lineId: string;
      rootLineId: string;
      productId: string;
      quantity: Decimal;
    }
  | {
      kind: "ADJUST";
      reservationId: string;
      lineId: string;
      deltaQuantity: Decimal;
    }
  | { kind: "RELINK"; reservationId: string; lineId: string }
  | { kind: "RELEASE"; reservationId: string };

// REGLA: lo despachado no se deshace con una versión. Al enviar, estas incidencias bloquean; al aprobar (pudo
// despacharse entre el envío y la última aprobación) el plan recorta a lo despachado y solo se avisa (§2.8).
export type ReservationIssue =
  | {
      kind: "BELOW_DISPATCHED";
      lineId: string;
      reservationId: string;
      requested: Decimal;
      dispatched: Decimal;
    }
  | {
      kind: "DROPPED_WITH_DISPATCH";
      lineId: string | null;
      reservationId: string;
      dispatched: Decimal;
    };

export type ReservationPlan = {
  ops: ReservationOp[];
  issues: ReservationIssue[];
};

export function planVersionReservations(
  stockLines: readonly VersionStockLine[],
  current: readonly CurrentReservation[],
): ReservationPlan {
  const unclaimed = new Map(current.map((r) => [r.rootLineId, r]));
  const plan: ReservationPlan = { ops: [], issues: [] };
  for (const line of stockLines) {
    assertQuantity(line.quantity);
    const root = line.originLineId ?? line.lineId;
    const reservation = unclaimed.get(root);
    unclaimed.delete(root);
    if (reservation && reservation.productId === line.productId)
      planExisting(plan, line, reservation);
    else {
      if (reservation) drop(plan, reservation, line.lineId);
      if (line.quantity.greaterThan(0))
        plan.ops.push({
          kind: "CREATE",
          lineId: line.lineId,
          rootLineId: root,
          productId: line.productId,
          quantity: line.quantity,
        });
    }
  }
  for (const reservation of unclaimed.values()) drop(plan, reservation, null);
  return plan;
}

function planExisting(
  plan: ReservationPlan,
  line: VersionStockLine,
  reservation: CurrentReservation,
): void {
  const dispatched = reservation.consumedQuantity;
  if (line.quantity.lessThan(dispatched))
    plan.issues.push({
      kind: "BELOW_DISPATCHED",
      lineId: line.lineId,
      reservationId: reservation.reservationId,
      requested: line.quantity,
      dispatched,
    });
  const target = Decimal.max(line.quantity, dispatched);
  // POR QUÉ: la reserva exige cantidad > 0 (CHECK); sin nada pedido ni despachado se libera.
  if (target.isZero()) {
    plan.ops.push({
      kind: "RELEASE",
      reservationId: reservation.reservationId,
    });
    return;
  }
  const deltaQuantity = target.minus(reservation.quantity);
  plan.ops.push(
    deltaQuantity.isZero()
      ? {
          kind: "RELINK",
          reservationId: reservation.reservationId,
          lineId: line.lineId,
        }
      : {
          kind: "ADJUST",
          reservationId: reservation.reservationId,
          lineId: line.lineId,
          deltaQuantity,
        },
  );
}

// Línea quitada, con otro producto o que dejó de ser STOCK_DIMA: se libera lo pendiente.
function drop(
  plan: ReservationPlan,
  reservation: CurrentReservation,
  lineId: string | null,
): void {
  if (reservation.consumedQuantity.greaterThan(0))
    plan.issues.push({
      kind: "DROPPED_WITH_DISPATCH",
      lineId,
      reservationId: reservation.reservationId,
      dispatched: reservation.consumedQuantity,
    });
  plan.ops.push({ kind: "RELEASE", reservationId: reservation.reservationId });
}

function assertQuantity(quantity: Decimal): void {
  if (quantity.isNegative() || quantity.decimalPlaces() > 2)
    throw new RangeError(`Cantidad de línea inválida: ${quantity.toString()}.`);
}
