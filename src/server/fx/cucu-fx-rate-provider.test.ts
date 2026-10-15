// src/server/fx/cucu-fx-rate-provider.test.ts
// Lectura de la respuesta de CUCU (AGENTS.md §2.2): la real del 15/10/2026 (régimen flexible, compra =
// venta), el TC de mañana cuando ya se publicó, y una respuesta rota.
import { describe, expect, it } from "vitest";
import { parseCucuResponse } from "./cucu-fx-rate-provider";
import real from "./fixtures/cucu-oficial.json";

describe("parseCucuResponse", () => {
  it("lee el TC vigente de la respuesta real, con compra y venta en texto exacto", () => {
    expect(parseCucuResponse(real)).toEqual([
      { effectiveOn: "2026-10-15", buyRate: "11.68", sellRate: "11.68" },
    ]);
  });

  it("agrega el de mañana si ya se publicó, e ignora una 'proxima' con otra forma", () => {
    const next = {
      ...real,
      tc_oficial: {
        ...real.tc_oficial,
        proxima: { compra: 11.7, venta: 11.7, vigencia_desde: "2026-10-16" },
      },
    };
    expect(parseCucuResponse(next)).toHaveLength(2);
    expect(parseCucuResponse(next)[1]).toEqual({
      effectiveOn: "2026-10-16",
      buyRate: "11.7",
      sellRate: "11.7",
    });
    const odd = {
      ...real,
      tc_oficial: { ...real.tc_oficial, proxima: "mañana" },
    };
    expect(parseCucuResponse(odd)).toHaveLength(1);
  });

  it("una respuesta sin tc_oficial falla en lugar de guardar basura", () => {
    expect(() => parseCucuResponse({ error: "rate limit" })).toThrow();
  });
});
