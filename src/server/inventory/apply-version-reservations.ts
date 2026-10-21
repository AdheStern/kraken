// src/server/inventory/apply-version-reservations.ts
// Al aprobarse una versión crea, ajusta, re-enlaza o libera las reservas de stock de sus líneas STOCK_DIMA en el
// almacén físico de la ciudad del CV, con sus movimientos en la transacción de la aprobación (AGENTS.md §2.8).
import type { ReservationOp } from "@/domain/inventory/plan-version-reservations";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { type LockedStocks, lockStocks, type StockKey } from "./lock-stocks";
import { postReservationMovement } from "./post-reservation-movement";
import { findStockWatchers } from "./stock-watchers";
import {
  planReservationsForVersion,
  type VersionReservationContext,
} from "./version-reservation-plan";

type ApplyInput = {
  cvId: string;
  versionId: string;
  actorId: string;
  label: string;
};

type Outcome = { missingWarehouse: boolean; clamped: boolean };

// REGLA: nunca lanza por causas de inventario; revertiría la decisión del último gerente. Lo que no se puede
// reservar (sin almacén, sin stock, ya despachado) se reserva igual o se recorta, y se avisa (§2.8).
export async function applyVersionReservations(
  tx: Tx,
  input: ApplyInput,
): Promise<void> {
  const context = await planReservationsForVersion(tx, input.versionId);
  const { ops, issues } = context.plan;
  if (ops.length === 0) return;
  const creates = ops.some((op) => op.kind === "CREATE");
  const warehouse = creates
    ? await tx.warehouse.findFirst({
        where: { kind: "FISICO", cityId: context.cityId, isActive: true },
        select: { id: true },
      })
    : null;
  const locked = await lockStocks(
    tx,
    ops.flatMap((op) => stockKeyOf(op, context, warehouse?.id)),
  );
  for (const op of ops) await applyOp(tx, op, locked, input, warehouse?.id);
  await notifyOutcome(tx, input, locked, {
    missingWarehouse: creates && !warehouse,
    clamped: issues.length > 0,
  });
}

function stockKeyOf(
  op: ReservationOp,
  context: VersionReservationContext,
  warehouseId?: string,
): StockKey[] {
  if (op.kind === "CREATE")
    return warehouseId ? [{ warehouseId, productId: op.productId }] : [];
  const ref = context.reservations.get(op.reservationId);
  return ref
    ? [{ warehouseId: ref.warehouseId, productId: ref.productId }]
    : [];
}

async function applyOp(
  tx: Tx,
  op: ReservationOp,
  locked: LockedStocks,
  input: ApplyInput,
  warehouseId?: string,
): Promise<void> {
  const base = {
    actorId: input.actorId,
    versionId: input.versionId,
    reason: input.label,
  };
  if (op.kind === "CREATE") {
    if (!warehouseId) return;
    await postReservationMovement(tx, locked, {
      ...base,
      kind: "CREAR",
      cvLineId: op.lineId,
      originLineId: op.rootLineId,
      warehouseId,
      productId: op.productId,
      quantity: op.quantity,
    });
  } else if (op.kind === "ADJUST")
    await postReservationMovement(tx, locked, {
      ...base,
      kind: "AJUSTE",
      reservationId: op.reservationId,
      deltaQuantity: op.deltaQuantity,
      cvLineId: op.lineId,
    });
  else if (op.kind === "RELINK")
    await tx.reservation.update({
      where: { id: op.reservationId },
      data: { cvLineId: op.lineId },
    });
  else
    await postReservationMovement(tx, locked, {
      ...base,
      kind: "LIBERAR",
      reservationId: op.reservationId,
    });
}

async function notifyOutcome(
  tx: Tx,
  input: ApplyInput,
  locked: LockedStocks,
  outcome: Outcome,
): Promise<void> {
  const userIds = await findStockWatchers(tx, input.versionId);
  const link = `/cv/${input.cvId}`;
  if (outcome.missingWarehouse)
    await notify(tx, {
      event: "RESERVA_SIN_ALMACEN",
      userIds,
      title: `${input.label}: sin almacén para reservar`,
      body: "La ciudad del CV no tiene un almacén físico activo; su stock de DIMA no quedó reservado.",
      link,
    });
  const short = await shortages(tx, locked);
  if (short.length > 0)
    await notify(tx, {
      event: "RESERVA_FALTANTE",
      userIds,
      title: `${input.label}: falta stock para su reserva`,
      body: `${short.join(" · ")}. Registra un ingreso o trae el stock con un traspaso.`,
      link,
    });
  if (outcome.clamped)
    await notify(tx, {
      event: "RESERVA_RECORTADA",
      userIds,
      title: `${input.label}: pide menos de lo ya despachado`,
      body: "La reserva quedó en lo despachado; registra la devolución de lo que sobra.",
      link,
    });
}

// POR QUÉ: se admite sobre-reservar; el disponible negativo es el faltante que avisa (decisión de 2026-10-21).
async function shortages(tx: Tx, locked: LockedStocks): Promise<string[]> {
  const short = [...locked.values()].filter((s) =>
    s.reservedQuantity.greaterThan(s.quantity),
  );
  if (short.length === 0) return [];
  const products = await tx.product.findMany({
    where: { id: { in: short.map((s) => s.productId) } },
    select: { id: true, code: true },
  });
  const codes = new Map(products.map((p) => [p.id, p.code]));
  return short.map(
    (s) =>
      `faltan ${s.reservedQuantity.minus(s.quantity).toString()} de ${codes.get(s.productId)}`,
  );
}
