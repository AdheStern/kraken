// src/server/inventory/return-items.ts
// Devolución de una salida (AGENTS.md §2.8): vuelve al almacén de origen todo o parte, al costo de esa salida y
// con sus seriales; si la salida fue a un CV, reabre su reserva (decisión de DIMA, 2026-10-21).
import Decimal from "decimal.js";
import { proportionalValue } from "@/domain/inventory/stock-valuation";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "./inventory-errors";
import { lockStocks } from "./lock-stocks";
import { type InvLineInput, postInvMovement } from "./post-inv-movement";
import { postReservationMovement } from "./post-reservation-movement";

export type ReturnInput = {
  movementId: string;
  lines: readonly { lineId: string; quantity: Decimal }[];
  notes: string | null;
  idempotencyKey: string;
};

type SourceLine = {
  id: string;
  productId: string;
  quantity: Decimal;
  valueUsd: Decimal;
  serialUnitId: string | null;
};

export async function returnItems(
  tx: Tx,
  actorId: string,
  input: ReturnInput,
): Promise<{ movementId: string; number: number }> {
  const repeated = await tx.invMovement.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, number: true },
  });
  if (repeated) return { movementId: repeated.id, number: repeated.number };
  const source = await loadSource(tx, input.movementId);
  const asked = input.lines.map((l) => {
    const line = source.lines.get(l.lineId);
    if (!line) throw new InventoryStateError("Una línea no es de esa salida.");
    return { line, quantity: l.quantity };
  });
  const locked = await lockStocks(
    tx,
    asked.map(({ line }) => ({
      warehouseId: source.warehouseId,
      productId: line.productId,
    })),
  );
  // REGLA: el tope se lee con el stock bloqueado; dos devoluciones simultáneas de la misma línea se serializan.
  const returned = await returnedSoFar(tx, [...source.lines.keys()]);
  const lines = toReturnLines(asked, returned);
  const posted = await postInvMovement(tx, locked, {
    kind: "DEVOLUCION",
    warehouseId: source.warehouseId,
    actorId,
    cvLineId: source.cvLineId ?? undefined,
    ticketId: source.ticketId ?? undefined,
    documentRef: `Salida N.º ${source.number}`,
    notes: input.notes ?? undefined,
    idempotencyKey: input.idempotencyKey,
    lines,
  });
  for (const [index, line] of posted.lines.entries())
    await reopenReservation(tx, locked, asked[index].line.id, line, actorId);
  return { movementId: posted.movementId, number: posted.number };
}

// POR QUÉ: cada porción se valoriza sobre lo ya devuelto (también dentro de este pedido), así las devoluciones
// parciales suman exactamente el valor de la salida.
function toReturnLines(
  asked: readonly { line: SourceLine; quantity: Decimal }[],
  returned: Map<string, Decimal>,
): InvLineInput[] {
  return asked.map(({ line, quantity }) => {
    const taken = returned.get(line.id) ?? new Decimal(0);
    if (quantity.plus(taken).greaterThan(line.quantity))
      throw new InventoryStateError(
        `Se despacharon ${line.quantity.toString()} y ya volvieron ${taken.toString()}; no se devuelve más de lo que salió.`,
      );
    returned.set(line.id, taken.plus(quantity));
    return {
      productId: line.productId,
      direction: "IN",
      quantity,
      valueUsd: proportionalValue(
        line.valueUsd,
        line.quantity,
        quantity,
        taken,
      ),
      serialUnitId: line.serialUnitId ?? undefined,
      returnsLineId: line.id,
    };
  });
}

async function loadSource(tx: Tx, movementId: string) {
  const movement = await tx.invMovement.findUnique({
    where: { id: movementId },
    select: {
      kind: true,
      number: true,
      warehouseId: true,
      cvLineId: true,
      ticketId: true,
      lines: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          valueUsd: true,
          serialUnitId: true,
        },
      },
    },
  });
  if (!movement || movement.kind !== "SALIDA")
    throw new InventoryStateError(
      "Solo se devuelve lo que salió con una salida.",
    );
  const lines = new Map<string, SourceLine>(
    movement.lines.map((l) => [
      l.id,
      {
        ...l,
        quantity: new Decimal(l.quantity.toString()).abs(),
        valueUsd: new Decimal(l.valueUsd.toString()).abs(),
      },
    ]),
  );
  return { ...movement, lines };
}

async function returnedSoFar(
  tx: Tx,
  lineIds: string[],
): Promise<Map<string, Decimal>> {
  const rows = await tx.invMovementLine.groupBy({
    by: ["returnsLineId"],
    where: { returnsLineId: { in: lineIds } },
    _sum: { quantity: true },
  });
  return new Map(
    rows.map((r) => [
      r.returnsLineId as string,
      new Decimal(r._sum.quantity?.toString() ?? 0),
    ]),
  );
}

// POR QUÉ: si la reserva ya se liberó (línea quitada o CV anulado), lo devuelto queda disponible sin reservar.
async function reopenReservation(
  tx: Tx,
  locked: Awaited<ReturnType<typeof lockStocks>>,
  sourceLineId: string,
  line: { lineId: string; quantity: Decimal },
  actorId: string,
): Promise<void> {
  const consumed = await tx.reservationMovement.findFirst({
    where: { kind: "CONSUMIR", invMovementLineId: sourceLineId },
    select: { reservation: { select: { id: true, status: true } } },
  });
  if (!consumed || consumed.reservation.status === "LIBERADA") return;
  await postReservationMovement(tx, locked, {
    kind: "REABRIR",
    reservationId: consumed.reservation.id,
    quantity: line.quantity,
    invMovementLineId: line.lineId,
    actorId,
  });
}
