// src/domain/dashboards/sale-amounts.ts
// Montos sumables de la venta (venta, costo, lo que tiene costo y horas vendidas), su resumen con factor y
// margen, y el reparto del crédito entre vendedores (AGENTS.md §2.2 y §6).
import Decimal from "decimal.js";
import { computeMargin, type Margin } from "../pricing/compute-margin";
import { roundHalfUp2 } from "../pricing/money";

export type SaleAmounts = {
  saleUsd: Decimal;
  costUsd: Decimal;
  costedSaleUsd: Decimal;
  costedCostUsd: Decimal;
  hoursMinutes: number;
};

export type SalesSummary = SaleAmounts &
  Margin & { ownServicesSaleUsd: Decimal };

const ZERO = new Decimal(0);

export const NO_SALES: SaleAmounts = {
  saleUsd: ZERO,
  costUsd: ZERO,
  costedSaleUsd: ZERO,
  costedCostUsd: ZERO,
  hoursMinutes: 0,
};

// REGLA: una línea con costo > 0 entra al factor y al margen; con costo 0 es servicio propio (§2.2, §6).
export function toSaleAmounts(
  line: { totalSaleUsd: Decimal; totalCostUsd: Decimal },
  hoursMinutes: number,
): SaleAmounts {
  const isCosted = line.totalCostUsd.greaterThan(0);
  return {
    saleUsd: line.totalSaleUsd,
    costUsd: line.totalCostUsd,
    costedSaleUsd: isCosted ? line.totalSaleUsd : ZERO,
    costedCostUsd: isCosted ? line.totalCostUsd : ZERO,
    hoursMinutes,
  };
}

export function addSaleAmounts(a: SaleAmounts, b: SaleAmounts): SaleAmounts {
  return {
    saleUsd: a.saleUsd.plus(b.saleUsd),
    costUsd: a.costUsd.plus(b.costUsd),
    costedSaleUsd: a.costedSaleUsd.plus(b.costedSaleUsd),
    costedCostUsd: a.costedCostUsd.plus(b.costedCostUsd),
    hoursMinutes: a.hoursMinutes + b.hoursMinutes,
  };
}

export function summarizeSales(amounts: SaleAmounts): SalesSummary {
  return {
    ...amounts,
    ...computeMargin(amounts.costedSaleUsd, amounts.costedCostUsd),
    ownServicesSaleUsd: amounts.saleUsd.minus(amounts.costedSaleUsd),
  };
}

// REGLA: una venta con varios vendedores se acredita en partes iguales; la última se lleva el resto, así los
// créditos suman exactamente el total (decisión 2026-10-22). Aislada para poder cambiarla.
export function splitSellerCredit(amount: Decimal, parts: number): Decimal[] {
  if (parts <= 1) return [amount];
  const share = roundHalfUp2(amount.dividedBy(parts));
  const head = Array.from({ length: parts - 1 }, () => share);
  return [...head, amount.minus(share.times(parts - 1))];
}

export function splitSaleAmounts(
  amounts: SaleAmounts,
  parts: number,
): SaleAmounts[] {
  const field = (key: Exclude<keyof SaleAmounts, "hoursMinutes">) =>
    splitSellerCredit(amounts[key], parts);
  const [sale, cost, costedSale, costedCost] = [
    field("saleUsd"),
    field("costUsd"),
    field("costedSaleUsd"),
    field("costedCostUsd"),
  ];
  const minutes = Math.floor(amounts.hoursMinutes / Math.max(parts, 1));
  return sale.map((_, i) => ({
    saleUsd: sale[i],
    costUsd: cost[i],
    costedSaleUsd: costedSale[i],
    costedCostUsd: costedCost[i],
    hoursMinutes:
      i === sale.length - 1
        ? amounts.hoursMinutes - minutes * (sale.length - 1)
        : minutes,
  }));
}
