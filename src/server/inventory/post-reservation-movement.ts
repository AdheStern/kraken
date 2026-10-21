// src/server/inventory/post-reservation-movement.ts
// Único camino para cambiar lo reservado: inserta el movimiento inmutable de la reserva y actualiza en la misma
// transacción la reserva y stock.cantidad_reservada, que son su caché (AGENTS.md §0.6, §2.8).
import Decimal from "decimal.js";
import type { ReservationStatus } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "./inventory-errors";
import { type LockedStocks, lockedStock } from "./lock-stocks";

type Common = { actorId: string | null; versionId?: string; reason?: string };

// REGLA: cantidades siempre positivas; el signo lo pone el tipo (CREAR, AJUSTE +, REABRIR suman a lo pendiente;
// AJUSTE −, LIBERAR y CONSUMIR restan).
export type ReservationMovementInput = Common &
  (
    | {
        kind: "CREAR";
        cvLineId: string;
        originLineId: string;
        warehouseId: string;
        productId: string;
        quantity: Decimal;
      }
    | {
        kind: "AJUSTE";
        reservationId: string;
        deltaQuantity: Decimal;
        cvLineId: string;
      }
    | { kind: "LIBERAR"; reservationId: string }
    | {
        kind: "CONSUMIR" | "REABRIR";
        reservationId: string;
        quantity: Decimal;
        invMovementLineId: string;
      }
  );

type State = {
  quantity: Decimal;
  consumedQuantity: Decimal;
  status: ReservationStatus;
};

// REGLA: el llamador bloqueó con lockStocks el stock (almacén, producto) de la reserva; eso serializa sus cambios.
export async function postReservationMovement(
  tx: Tx,
  locked: LockedStocks,
  input: ReservationMovementInput,
): Promise<{ reservationId: string; pendingQuantity: Decimal }> {
  const { reservationId, key, before } = await loadOrCreate(tx, input);
  const stock = lockedStock(locked, key);
  const { after, pendingDelta, cvLineId } = apply(before, input);
  if (pendingDelta.isZero())
    return { reservationId, pendingQuantity: pending(after) };
  await tx.reservationMovement.create({
    data: {
      reservationId,
      kind: input.kind,
      quantity: pendingDelta.toFixed(2),
      versionId: input.versionId,
      invMovementLineId:
        "invMovementLineId" in input ? input.invMovementLineId : undefined,
      reason: input.reason,
      actorId: input.actorId,
    },
  });
  await tx.reservation.update({
    where: { id: reservationId },
    data: {
      quantity: after.quantity.toFixed(2),
      consumedQuantity: after.consumedQuantity.toFixed(2),
      status: after.status,
      ...(cvLineId ? { cvLineId } : {}),
    },
  });
  stock.reservedQuantity = stock.reservedQuantity.plus(pendingDelta);
  await tx.stock.update({
    where: { id: stock.stockId },
    data: { reservedQuantity: stock.reservedQuantity.toFixed(2) },
  });
  return { reservationId, pendingQuantity: pending(after) };
}

// La reserva recién creada no tiene estado previo: todo lo que reserva es pendiente nuevo.
function apply(previous: State | null, input: ReservationMovementInput) {
  if (input.kind === "CREAR") {
    const after: State = {
      quantity: input.quantity,
      consumedQuantity: new Decimal(0),
      status: "ACTIVA",
    };
    return { after, pendingDelta: input.quantity, cvLineId: undefined };
  }
  if (!previous || previous.status === "LIBERADA")
    throw new InventoryStateError("La reserva ya fue liberada.");
  const before = previous;
  const was = pending(before);
  let after: State;
  let cvLineId: string | undefined;
  switch (input.kind) {
    case "AJUSTE":
      after = withStatus({
        ...before,
        quantity: before.quantity.plus(input.deltaQuantity),
      });
      cvLineId = input.cvLineId;
      break;
    case "LIBERAR":
      // POR QUÉ: la reserva exige cantidad > 0; sin despachos queda LIBERADA con su cantidad, con despachos se
      // recorta a lo despachado (CONSUMIDA).
      after = before.consumedQuantity.isZero()
        ? { ...before, status: "LIBERADA" }
        : { ...before, quantity: before.consumedQuantity, status: "CONSUMIDA" };
      break;
    case "CONSUMIR":
      after = withStatus({
        ...before,
        consumedQuantity: before.consumedQuantity.plus(input.quantity),
      });
      break;
    case "REABRIR":
      after = withStatus({
        ...before,
        consumedQuantity: before.consumedQuantity.minus(input.quantity),
      });
      break;
  }
  if (
    after.consumedQuantity.isNegative() ||
    after.consumedQuantity.greaterThan(after.quantity)
  )
    throw new InventoryStateError("La reserva no cubre esa cantidad.");
  return { after, pendingDelta: pending(after).minus(was), cvLineId };
}

function withStatus(state: State): State {
  return { ...state, status: pending(state).isZero() ? "CONSUMIDA" : "ACTIVA" };
}

function pending(state: State): Decimal {
  return state.status === "LIBERADA"
    ? new Decimal(0)
    : state.quantity.minus(state.consumedQuantity);
}

async function loadOrCreate(tx: Tx, input: ReservationMovementInput) {
  if (input.kind === "CREAR") {
    const { warehouseId, productId } = input;
    const created = await tx.reservation.create({
      data: {
        cvLineId: input.cvLineId,
        originLineId: input.originLineId,
        warehouseId,
        productId,
        quantity: input.quantity.toFixed(2),
        status: "ACTIVA",
      },
      select: { id: true },
    });
    return {
      reservationId: created.id,
      key: { warehouseId, productId },
      before: null,
    };
  }
  const row = await tx.reservation.findUniqueOrThrow({
    where: { id: input.reservationId },
  });
  const before: State = {
    quantity: new Decimal(row.quantity.toString()),
    consumedQuantity: new Decimal(row.consumedQuantity.toString()),
    status: row.status,
  };
  return {
    reservationId: row.id,
    key: { warehouseId: row.warehouseId, productId: row.productId },
    before,
  };
}
