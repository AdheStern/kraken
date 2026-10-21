// src/server/inventory/version-reservation-plan.ts
// Arma el plan de reservas de stock de una versión con los datos de la base: líneas STOCK_DIMA de la versión y
// reservas vigentes del CV, emparejadas por linaje (AGENTS.md §2.3, §2.8). Lo usan el envío y la aprobación.
import Decimal from "decimal.js";
import {
  planVersionReservations,
  type ReservationPlan,
} from "@/domain/inventory/plan-version-reservations";
import type { Tx } from "@/server/db";

export type ReservedRef = {
  warehouseId: string;
  productId: string;
  description: string;
};

export type VersionReservationContext = {
  cityId: string;
  isOpeningBalance: boolean;
  plan: ReservationPlan;
  lineDescriptions: ReadonlyMap<string, string>;
  // Líneas STOCK_DIMA sin producto del catálogo: no se pueden reservar.
  invalidLines: string[];
  reservations: ReadonlyMap<string, ReservedRef>;
};

export async function planReservationsForVersion(
  tx: Tx,
  versionId: string,
): Promise<VersionReservationContext> {
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: versionId },
    select: {
      cvId: true,
      cv: { select: { cityId: true, isOpeningBalance: true } },
      lines: {
        where: { kind: "ITEM", supplyMode: "STOCK_DIMA" },
        select: {
          id: true,
          originLineId: true,
          productId: true,
          quantity: true,
          description: true,
        },
      },
    },
  });
  const current = await tx.reservation.findMany({
    where: {
      status: { in: ["ACTIVA", "CONSUMIDA"] },
      cvLine: { version: { cvId: version.cvId } },
    },
    select: {
      id: true,
      originLineId: true,
      productId: true,
      warehouseId: true,
      quantity: true,
      consumedQuantity: true,
      cvLine: { select: { description: true } },
    },
  });
  // POR QUÉ: un CV de saldo inicial carga horas ya vendidas; sus bienes se entregaron antes del sistema (§2.4).
  const lines = version.cv.isOpeningBalance ? [] : version.lines;
  const valid = lines.filter((l) => l.productId && l.quantity);
  return {
    cityId: version.cv.cityId,
    isOpeningBalance: version.cv.isOpeningBalance,
    plan: planVersionReservations(
      valid.map((l) => ({
        lineId: l.id,
        originLineId: l.originLineId,
        productId: l.productId as string,
        quantity: new Decimal(String(l.quantity)),
      })),
      version.cv.isOpeningBalance
        ? []
        : current.map((r) => ({
            reservationId: r.id,
            rootLineId: r.originLineId,
            productId: r.productId,
            quantity: new Decimal(r.quantity.toString()),
            consumedQuantity: new Decimal(r.consumedQuantity.toString()),
          })),
    ),
    lineDescriptions: new Map(lines.map((l) => [l.id, l.description])),
    invalidLines: lines.filter((l) => !l.productId).map((l) => l.description),
    reservations: new Map(
      current.map((r) => [
        r.id,
        {
          warehouseId: r.warehouseId,
          productId: r.productId,
          description: r.cvLine.description,
        },
      ]),
    ),
  };
}

// REGLA: al enviar, una línea STOCK_DIMA exige un producto del catálogo y ninguna versión baja de lo ya
// despachado; corregirlo es una devolución, no una versión (§2.8).
export function findReservationPlanProblem(
  context: VersionReservationContext,
): string | null {
  const [invalid] = context.invalidLines;
  if (invalid)
    return `«${invalid}» sale del stock de DIMA: elige su producto del catálogo para poder reservarlo.`;
  const [issue] = context.plan.issues;
  if (!issue) return null;
  const name =
    (issue.lineId && context.lineDescriptions.get(issue.lineId)) ??
    context.reservations.get(issue.reservationId)?.description ??
    "la línea";
  return issue.kind === "BELOW_DISPATCHED"
    ? `«${name}» pide ${issue.requested.toString()}, pero ya se despacharon ${issue.dispatched.toString()}. No bajes de lo despachado; registra antes la devolución.`
    : `«${name}» ya tiene ${issue.dispatched.toString()} despachadas: no la quites ni cambies su producto; registra antes la devolución.`;
}
