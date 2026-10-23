// src/features/dashboards/queries/get-inventory-dashboard.ts
// Tablero de inventario: valor por almacén, rotación del periodo (salidas netas sobre el valor promedio,
// reconstruido del libro) y lo que está en tránsito (AGENTS.md §2.8 y §6). Solo para quien ve costos.
import Decimal from "decimal.js";
import {
  inventoryTurnover,
  stockValueAt,
} from "@/domain/dashboards/inventory-kpis";
import { type PeriodRef, resolvePeriod } from "@/domain/dashboards/period";
import { countTransfersInTransit } from "@/features/inventory/queries/count-transfers-in-transit";
import { canSeeInventoryDashboard } from "@/server/authz/dashboard-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { scopeStockQuery } from "@/server/authz/scope-stock-query";
import { prisma } from "@/server/db";
import type { InventoryDashboard } from "../types";
import { dec } from "./line-totals";

export async function getInventoryDashboard(
  user: SessionUser,
  input: { period: PeriodRef; cityId: string | null },
): Promise<InventoryDashboard | null> {
  if (!canSeeInventoryDashboard(user)) return null;
  const period = resolvePeriod(input.period);
  const inCity = input.cityId ? { cityId: input.cityId } : {};
  const movements = {
    AND: [scopeInvMovementQuery(user), { warehouse: inCity }],
  };
  const [stocks, warehouses, outbound, points, transfers] = await Promise.all([
    prisma.stock.groupBy({
      by: ["warehouseId"],
      where: { AND: [scopeStockQuery(user), { warehouse: inCity }] },
      _sum: { valueUsd: true },
    }),
    prisma.warehouse.findMany({
      where: inCity,
      select: { id: true, name: true, kind: true },
      orderBy: { name: "asc" },
    }),
    prisma.invMovementLine.aggregate({
      where: {
        movement: {
          ...movements,
          kind: { in: ["SALIDA", "DEVOLUCION"] },
          createdAt: { gte: period.start, lt: period.end },
        },
      },
      _sum: { valueUsd: true },
    }),
    // LIMITACIÓN: lee el libro completo hasta el fin del periodo; con el volumen de DIMA alcanza (§3).
    prisma.invMovementLine.findMany({
      where: { movement: { ...movements, createdAt: { lt: period.end } } },
      orderBy: [{ movement: { createdAt: "asc" } }, { id: "asc" }],
      select: {
        productId: true,
        balanceValueUsd: true,
        movement: { select: { warehouseId: true, createdAt: true } },
      },
    }),
    countTransfersInTransit(user),
  ]);
  const valueByWarehouse = new Map(
    stocks.map((s) => [s.warehouseId, dec(s._sum.valueUsd)]),
  );
  const balance = points.map((p) => ({
    stockKey: `${p.movement.warehouseId}:${p.productId}`,
    at: p.movement.createdAt,
    balanceValueUsd: dec(p.balanceValueUsd),
  }));
  // POR QUÉ: las salidas llevan valor negativo y las devoluciones positivo; lo que salió es el neto con signo invertido.
  const outboundUsd = dec(outbound._sum.valueUsd).negated();
  const opening = stockValueAt(balance, period.start);
  const closing = stockValueAt(balance, period.end);
  const rows = warehouses
    .map((w) => ({ ...w, value: valueByWarehouse.get(w.id) ?? new Decimal(0) }))
    .filter((w) => w.value.greaterThan(0) || w.kind !== "TRANSITO");
  return {
    periodLabel: period.label,
    totalValueUsd: sum(rows.map((r) => r.value)).toFixed(2),
    warehouses: rows.map(({ value, ...w }) => ({
      ...w,
      valueUsd: value.toFixed(2),
    })),
    outboundUsd: outboundUsd.toFixed(2),
    openingUsd: opening.toFixed(2),
    closingUsd: closing.toFixed(2),
    turnover:
      inventoryTurnover(outboundUsd, opening, closing)?.toFixed(2) ?? null,
    transit: {
      transfers,
      valueUsd: sum(
        rows.filter((r) => r.kind === "TRANSITO").map((r) => r.value),
      ).toFixed(2),
    },
  };
}

function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0));
}
