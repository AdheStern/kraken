// src/server/authz/redact-amounts.test.ts
// Auditoría sin montos para quien no los ve (AGENTS.md §2.9, regla 12).
import { describe, expect, it } from "vitest";
import { REDACTED, redactAmounts } from "./redact-amounts";

describe("redactAmounts", () => {
  it("oculta montos, factor y TC en USD o Bs, también anidados y en listas", () => {
    expect(
      redactAmounts({
        status: "APROBADA",
        totalSaleUsd: "62500.00",
        totalCostUsd: "40000.00",
        lines: [{ description: "Switch", unitCostUsd: "10", factor: "2.92" }],
        nested: { saleBs: "100", quantity: "2" },
      }),
    ).toEqual({
      status: "APROBADA",
      totalSaleUsd: REDACTED,
      totalCostUsd: REDACTED,
      lines: [
        { description: "Switch", unitCostUsd: REDACTED, factor: REDACTED },
      ],
      nested: { saleBs: REDACTED, quantity: "2" },
    });
  });

  it("deja lo que no es monto y los vacíos", () => {
    expect(
      redactAmounts({ name: "Ana", unitSaleUsd: null, minutes: 60 }),
    ).toEqual({
      name: "Ana",
      unitSaleUsd: null,
      minutes: 60,
    });
    expect(redactAmounts("texto")).toBe("texto");
    expect(redactAmounts(null)).toBeNull();
  });
});
