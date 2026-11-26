// src/domain/dashboards/sales-breakdown.ts
// Ventas aprobadas del periodo: total, desglose por área, comercial, cliente, tecnología o ciudad y serie
// mensual, sobre una fila por línea de la versión aprobada vigente (AGENTS.md §6).
import {
  addSaleAmounts,
  NO_SALES,
  type SaleAmounts,
  splitSaleAmounts,
} from "./sale-amounts";

// POR QUÉ: closedOn es la fecha de negocio de la primera aprobación del CV (cierre de la venta); los montos son
// los de la versión aprobada vigente (decisión 2026-10-22).
export type SaleFact = {
  cvId: string;
  closedOn: string;
  areaId: string;
  technologyId: string | null;
  cityId: string;
  customerId: string;
  sellerIds: readonly string[];
  amounts: SaleAmounts;
  // POR QUÉ: solo una línea de contrato por vigencia lo trae; months es null si sus fechas no dan duración.
  term?: { months: number | null };
};

export type SalesDimension =
  | "AREA"
  | "COMERCIAL"
  | "CLIENTE"
  | "TECNOLOGIA"
  | "CIUDAD";

export type SalesGroup = {
  key: string | null;
  amounts: SaleAmounts;
  cvCount: number;
  termContracts: number;
};

type Bucket = { amounts: SaleAmounts; cvIds: Set<string>; terms: number };

export function totalSales(facts: readonly SaleFact[]): SalesGroup {
  const bucket = collect(facts.map((fact) => [null, fact, fact.amounts]));
  return toGroup(null, bucket.get(null));
}

export function breakdownSales(
  facts: readonly SaleFact[],
  dimension: SalesDimension,
): SalesGroup[] {
  const entries = facts.flatMap((fact) => entriesOf(fact, dimension));
  return [...collect(entries)]
    .map(([key, bucket]) => toGroup(key, bucket))
    .sort((a, b) => b.amounts.saleUsd.comparedTo(a.amounts.saleUsd));
}

export function monthlySales(
  facts: readonly SaleFact[],
  months: readonly string[],
): { month: string; amounts: SaleAmounts }[] {
  const byMonth = collect(
    facts.map((fact) => [fact.closedOn.slice(0, 7), fact, fact.amounts]),
  );
  return months.map((month) => ({
    month,
    amounts: byMonth.get(month)?.amounts ?? NO_SALES,
  }));
}

type Entry = [string | null, SaleFact, SaleAmounts];

function entriesOf(fact: SaleFact, dimension: SalesDimension): Entry[] {
  if (dimension !== "COMERCIAL")
    return [[keyOf(fact, dimension), fact, fact.amounts]];
  if (fact.sellerIds.length === 0) return [[null, fact, fact.amounts]];
  const shares = splitSaleAmounts(fact.amounts, fact.sellerIds.length);
  return fact.sellerIds.map((sellerId, i) => [sellerId, fact, shares[i]]);
}

function keyOf(fact: SaleFact, dimension: SalesDimension): string | null {
  if (dimension === "AREA") return fact.areaId;
  if (dimension === "CLIENTE") return fact.customerId;
  if (dimension === "TECNOLOGIA") return fact.technologyId;
  return fact.cityId;
}

function collect(entries: readonly Entry[]): Map<string | null, Bucket> {
  const buckets = new Map<string | null, Bucket>();
  for (const [key, fact, amounts] of entries) {
    const bucket = buckets.get(key) ?? {
      amounts: NO_SALES,
      cvIds: new Set(),
      terms: 0,
    };
    bucket.amounts = addSaleAmounts(bucket.amounts, amounts);
    // REGLA: un contrato no se reparte entre vendedores: cuenta entero para cada uno, como los CV.
    if (fact.term) bucket.terms += 1;
    bucket.cvIds.add(fact.cvId);
    buckets.set(key, bucket);
  }
  return buckets;
}

function toGroup(key: string | null, bucket: Bucket | undefined): SalesGroup {
  return {
    key,
    amounts: bucket?.amounts ?? NO_SALES,
    cvCount: bucket?.cvIds.size ?? 0,
    termContracts: bucket?.terms ?? 0,
  };
}
