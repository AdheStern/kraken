// src/domain/dashboards/sales.test.ts
// KPIs de venta (AGENTS.md §6): montos y margen con PRECIO-01 (§15.1), reparto entre vendedores, desgloses,
// serie mensual, avance de meta y variación.
import Decimal from "decimal.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { goalForMonths, progressPct, variationPct } from "./goal-progress";
import {
  splitSaleAmounts,
  splitSellerCredit,
  summarizeSales,
  toSaleAmounts,
} from "./sale-amounts";
import {
  breakdownSales,
  monthlySales,
  type SaleFact,
  totalSales,
} from "./sales-breakdown";

const d = (value: string | number) => new Decimal(value);

const line = (sale: string, cost: string, hours = 0) =>
  toSaleAmounts({ totalSaleUsd: d(sale), totalCostUsd: d(cost) }, hours);

const fact = (over: Partial<SaleFact>): SaleFact => ({
  cvId: "cv-1",
  closedOn: "2026-10-05",
  areaId: "DIMANET",
  technologyId: "CISCO",
  cityId: "LP",
  customerId: "C1",
  sellerIds: ["ana"],
  amounts: line("100", "50"),
  ...over,
});

// PRECIO-01 como venta: L1 por factor, L2 por precio, L3 servicio propio (§15.1).
const precio01 = [
  fact({ amounts: line("985.76", "337.59") }),
  fact({ amounts: line("130.80", "45.22") }),
  fact({ amounts: line("269.12", "0"), areaId: "DIMASOFT" }),
];

describe("montos de venta", () => {
  it("PRECIO-01: factor y margen solo sobre lo que tiene costo; el servicio propio va aparte", () => {
    const summary = summarizeSales(totalSales(precio01).amounts);
    expect(summary.saleUsd.toFixed(2)).toBe("1385.68");
    expect(summary.costUsd.toFixed(2)).toBe("382.81");
    expect(summary.factor?.toFixed(2)).toBe("2.92");
    expect(summary.marginUsd.toFixed(2)).toBe("733.75");
    expect(summary.marginPct?.toFixed(2)).toBe("65.72");
    expect(summary.ownServicesSaleUsd.toFixed(2)).toBe("269.12");
  });

  it("sin líneas con costo no hay factor ni % de margen", () => {
    const summary = summarizeSales(line("269.12", "0"));
    expect([summary.factor, summary.marginPct]).toEqual([null, null]);
  });

  it("el crédito repartido entre vendedores suma exactamente el total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 7 }),
        (cents, parts) => {
          const amount = d(cents).dividedBy(100);
          const shares = splitSellerCredit(amount, parts);
          const sum = shares.reduce((acc, s) => acc.plus(s), d(0));
          expect(shares).toHaveLength(parts);
          expect(sum.equals(amount)).toBe(true);
        },
      ),
    );
  });

  it("reparte también las horas vendidas sin perder minutos", () => {
    const shares = splitSaleAmounts(line("100.01", "40", 61), 2);
    expect(shares.map((s) => s.saleUsd.toFixed(2))).toEqual(["50.01", "50.00"]);
    expect(shares.map((s) => s.hoursMinutes)).toEqual([30, 31]);
  });
});

describe("desgloses", () => {
  it("por comercial reparte en partes iguales y cuenta el CV en cada uno", () => {
    const groups = breakdownSales(
      [
        fact({ sellerIds: ["ana", "beto"], amounts: line("300", "100") }),
        fact({ cvId: "cv-2", sellerIds: ["ana"], amounts: line("50", "10") }),
      ],
      "COMERCIAL",
    );
    expect(
      groups.map((g) => [g.key, g.amounts.saleUsd.toFixed(2), g.cvCount]),
    ).toEqual([
      ["ana", "200.00", 2],
      ["beto", "150.00", 1],
    ]);
  });

  it("por área ordena de mayor a menor venta", () => {
    const groups = breakdownSales(precio01, "AREA");
    expect(groups.map((g) => [g.key, g.amounts.saleUsd.toFixed(2)])).toEqual([
      ["DIMANET", "1116.56"],
      ["DIMASOFT", "269.12"],
    ]);
  });

  it("agrupa por cliente, tecnología y ciudad; sin vendedor queda en su propio grupo", () => {
    const facts = [
      fact({ customerId: "C2", technologyId: null, cityId: "SC" }),
      fact({ cvId: "cv-2", sellerIds: [] }),
    ];
    const keys = (dimension: Parameters<typeof breakdownSales>[1]) =>
      breakdownSales(facts, dimension).map((g) => g.key);
    expect(keys("CLIENTE")).toEqual(["C2", "C1"]);
    expect(keys("TECNOLOGIA")).toEqual([null, "CISCO"]);
    expect(keys("CIUDAD")).toEqual(["SC", "LP"]);
    expect(keys("COMERCIAL")).toEqual(["ana", null]);
  });

  it("la serie mensual tiene todos los meses del periodo, aunque estén vacíos", () => {
    const series = monthlySales(
      [fact({ closedOn: "2026-11-30" }), fact({ closedOn: "2026-11-01" })],
      ["2026-10", "2026-11", "2026-12"],
    );
    expect(series.map((m) => m.amounts.saleUsd.toFixed(2))).toEqual([
      "0.00",
      "200.00",
      "0.00",
    ]);
  });
});

describe("metas y variación", () => {
  const goals = [
    { month: "2026-10", value: d(1000) },
    { month: "2026-11", value: d(500) },
  ];

  it("la meta del periodo suma sus meses; sin metas cargadas no hay meta", () => {
    expect(goalForMonths(goals, ["2026-10", "2026-11"])?.toFixed(2)).toBe(
      "1500.00",
    );
    expect(goalForMonths(goals, ["2026-12"])).toBeNull();
  });

  it("el avance se trunca y sin meta es null", () => {
    expect(progressPct(d("1494"), d(1500))).toBe(99);
    expect(progressPct(d(10), null)).toBeNull();
    expect(progressPct(d(10), d(0))).toBeNull();
  });

  it("la variación usa un decimal y sin base no se calcula", () => {
    expect(variationPct(d(150), d(120))).toBe(25);
    expect(variationPct(d(100), d(300))).toBe(-66.7);
    expect(variationPct(d(100), d(0))).toBeNull();
  });
});
