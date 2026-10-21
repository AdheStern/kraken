// src/features/inventory/queries/get-pos-catalog.ts
// Lo que el POS puede despachar desde un almacén (AGENTS.md §2.8): productos con stock, su disponible, sus seriales
// en el almacén y las reservas de CV pendientes. Sin costos (regla 12).
import Decimal from "decimal.js";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeReservationQuery } from "@/server/authz/scope-reservation-query";
import { scopeStockQuery } from "@/server/authz/scope-stock-query";
import { prisma } from "@/server/db";
import type { PendingReservation, PosCatalogItem } from "../types";

export async function getPosCatalog(
  user: SessionUser,
  warehouseId: string,
): Promise<{ items: PosCatalogItem[]; reservations: PendingReservation[] }> {
  const [stocks, reservations] = await Promise.all([
    prisma.stock.findMany({
      where: {
        AND: [scopeStockQuery(user), { warehouseId, quantity: { gt: 0 } }],
      },
      orderBy: { product: { code: "asc" } },
      select: {
        quantity: true,
        reservedQuantity: true,
        product: {
          select: {
            id: true,
            code: true,
            description: true,
            isSerialized: true,
            serialUnits: {
              where: { warehouseId },
              select: { serial: true },
              orderBy: { serial: "asc" },
            },
          },
        },
      },
    }),
    prisma.reservation.findMany({
      where: {
        AND: [scopeReservationQuery(user), { warehouseId, status: "ACTIVA" }],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        quantity: true,
        consumedQuantity: true,
        product: { select: { id: true, code: true } },
        cvLine: {
          select: {
            description: true,
            version: {
              select: {
                number: true,
                cv: {
                  select: { code: true, customer: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return {
    items: stocks.map(({ product, quantity, reservedQuantity }) => ({
      productId: product.id,
      code: product.code,
      description: product.description,
      isSerialized: product.isSerialized,
      availableQuantity: new Decimal(quantity.toString())
        .minus(reservedQuantity.toString())
        .toFixed(2),
      serials: product.serialUnits.map((u) => u.serial),
    })),
    reservations: reservations.map((r) => ({
      reservationId: r.id,
      cvLabel: toCvVersionLabel(
        r.cvLine.version.cv.code,
        r.cvLine.version.number,
      ),
      customerName: r.cvLine.version.cv.customer.name,
      productId: r.product.id,
      productCode: r.product.code,
      lineDescription: r.cvLine.description,
      pendingQuantity: new Decimal(r.quantity.toString())
        .minus(r.consumedQuantity.toString())
        .toFixed(2),
    })),
  };
}
