// src/features/admin/schemas/fx-schemas.test.ts
// Carga manual del TC (AGENTS.md §2.2, §15.4): régimen flexible (venta vacía = compra), hasta 4 decimales.
import { describe, expect, it } from "vitest";
import { manualFxRateSchema } from "./fx-schemas";

const parse = (buyRate: string, sellRate: string) =>
  manualFxRateSchema.safeParse({
    effectiveOn: "2026-10-15",
    buyRate,
    sellRate,
  });

describe("manualFxRateSchema", () => {
  it("con la venta vacía usa la compra (TCO único)", () => {
    expect(parse("11.68", " ").data).toMatchObject({
      buyRate: "11.68",
      sellRate: "11.68",
    });
  });

  it("acepta compra menor que venta y hasta 4 decimales", () => {
    expect(parse("6.86", "6.9625").success).toBe(true);
  });

  it("rechaza compra mayor que venta, 5 decimales y ceros", () => {
    expect(parse("6.97", "6.96").success).toBe(false);
    expect(parse("6.96251", "").success).toBe(false);
    expect(parse("0", "").success).toBe(false);
  });
});
