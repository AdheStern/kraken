// src/server/inventory/dispatch-items.ts
// Salida de un almacén (AGENTS.md §2.8): a una línea de CV (consume su reserva), a un ticket abierto o a uso
// interno con motivo. Lo usan el POS y las salidas; devuelve el número del comprobante.
import Decimal from "decimal.js";
import type { Tx } from "@/server/db";
import {
  InsufficientStockError,
  InventoryStateError,
} from "./inventory-errors";
import { type LockedStocks, lockStocks, stockKey } from "./lock-stocks";
import { type InvLineInput, postInvMovement } from "./post-inv-movement";
import { postReservationMovement } from "./post-reservation-movement";
import { resolveOutboundSerials } from "./serial-lookup";

export type DispatchDestination =
  | { kind: "CV"; reservationId: string }
  | { kind: "TICKET"; ticketId: string }
  | { kind: "INTERNO"; reason: string };

export type DispatchLine = {
  productId: string;
  quantity: Decimal;
  serials: string[];
};

export type DispatchInput = {
  warehouseId: string;
  destination: DispatchDestination;
  notes: string | null;
  idempotencyKey: string;
  lines: readonly DispatchLine[];
};

type Target = {
  cvLineId?: string;
  ticketId?: string;
  reservationId?: string;
  notes: string | null;
};

export async function dispatchItems(
  tx: Tx,
  actorId: string,
  input: DispatchInput,
): Promise<{ movementId: string; number: number }> {
  const repeated = await tx.invMovement.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, number: true },
  });
  if (repeated) return { movementId: repeated.id, number: repeated.number };
  await assertNotTransit(tx, input.warehouseId);
  const target = await resolveDestination(tx, input);
  const locked = await lockStocks(
    tx,
    input.lines.map((l) => ({
      warehouseId: input.warehouseId,
      productId: l.productId,
    })),
  );
  if (!target.reservationId) await assertAvailable(tx, locked, input);
  const lines: InvLineInput[] = [];
  for (const line of input.lines)
    lines.push(...(await toOutLines(tx, input.warehouseId, line)));
  const posted = await postInvMovement(tx, locked, {
    kind: "SALIDA",
    warehouseId: input.warehouseId,
    actorId,
    cvLineId: target.cvLineId,
    ticketId: target.ticketId,
    notes: target.notes ?? undefined,
    idempotencyKey: input.idempotencyKey,
    lines,
  });
  for (const line of posted.lines)
    if (target.reservationId)
      await postReservationMovement(tx, locked, {
        kind: "CONSUMIR",
        reservationId: target.reservationId,
        quantity: line.quantity.abs(),
        invMovementLineId: line.lineId,
        actorId,
      });
  return { movementId: posted.movementId, number: posted.number };
}

async function assertNotTransit(tx: Tx, warehouseId: string): Promise<void> {
  const warehouse = await tx.warehouse.findUniqueOrThrow({
    where: { id: warehouseId },
    select: { kind: true },
  });
  if (warehouse.kind === "TRANSITO")
    throw new InventoryStateError(
      "Desde tránsito no hay salidas: recibe el traspaso antes.",
    );
}

// REGLA: lo reservado es de su CV; una salida a ticket o a uso interno solo toma lo disponible (§2.8).
async function assertAvailable(
  tx: Tx,
  locked: LockedStocks,
  input: DispatchInput,
): Promise<void> {
  for (const [productId, quantity] of totals(input.lines)) {
    const stock = locked.get(
      stockKey({ warehouseId: input.warehouseId, productId }),
    );
    const available = stock
      ? stock.quantity.minus(stock.reservedQuantity)
      : new Decimal(0);
    if (quantity.greaterThan(available)) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { code: true },
      });
      throw new InsufficientStockError(
        product?.code ?? "el producto",
        Decimal.max(available, 0).toString(),
      );
    }
  }
}

async function resolveDestination(
  tx: Tx,
  input: DispatchInput,
): Promise<Target> {
  const { destination } = input;
  if (destination.kind === "INTERNO") {
    if (destination.reason.trim().length < 5)
      throw new InventoryStateError(
        "Explica para qué es el uso interno (mínimo 5 caracteres).",
      );
    const notes = [destination.reason.trim(), input.notes].filter(Boolean);
    return { notes: notes.join(" · ") };
  }
  if (destination.kind === "TICKET") {
    const ticket = await tx.ticket.findUnique({
      where: { id: destination.ticketId },
      select: { status: true },
    });
    if (!ticket || ticket.status === "CERRADO" || ticket.status === "CANCELADO")
      throw new InventoryStateError(
        "El ticket ya no está abierto; elige otro destino.",
      );
    return { ticketId: destination.ticketId, notes: input.notes };
  }
  return resolveReservation(tx, destination.reservationId, input);
}

async function resolveReservation(
  tx: Tx,
  reservationId: string,
  input: DispatchInput,
): Promise<Target> {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!reservation || reservation.status !== "ACTIVA")
    throw new InventoryStateError(
      "La reserva ya no está activa; recarga los pendientes del CV.",
    );
  if (reservation.warehouseId !== input.warehouseId)
    throw new InventoryStateError(
      "La reserva es de otro almacén; despáchala desde allí o traspasa el stock antes.",
    );
  const pending = new Decimal(reservation.quantity.toString()).minus(
    reservation.consumedQuantity.toString(),
  );
  const asked = totals(input.lines);
  const quantity = asked.get(reservation.productId);
  if (asked.size !== 1 || !quantity)
    throw new InventoryStateError(
      "A una línea de CV solo sale el producto que reservó.",
    );
  if (quantity.greaterThan(pending))
    throw new InventoryStateError(
      `La reserva cubre ${pending.toString()}; no despaches más de lo que pide el CV.`,
    );
  return { cvLineId: reservation.cvLineId, reservationId, notes: input.notes };
}

// REGLA: un serializado sale con el serial de cada unidad; uno sin serial no lleva seriales (§2.8).
async function toOutLines(
  tx: Tx,
  warehouseId: string,
  line: DispatchLine,
): Promise<InvLineInput[]> {
  if (line.serials.length === 0)
    return [
      { productId: line.productId, direction: "OUT", quantity: line.quantity },
    ];
  if (!line.quantity.equals(line.serials.length))
    throw new InventoryStateError("Indica un serial por cada unidad que sale.");
  const ids = await resolveOutboundSerials(
    tx,
    line.productId,
    warehouseId,
    line.serials,
  );
  return ids.map((serialUnitId) => ({
    productId: line.productId,
    direction: "OUT" as const,
    quantity: new Decimal(1),
    serialUnitId,
  }));
}

function totals(lines: readonly DispatchLine[]): Map<string, Decimal> {
  const sums = new Map<string, Decimal>();
  for (const l of lines)
    sums.set(
      l.productId,
      (sums.get(l.productId) ?? new Decimal(0)).plus(l.quantity),
    );
  return sums;
}
