// src/features/sales-control/line-records.test.ts
// Preparación de las líneas para guardar: los subítems (1.1) guardan su marca y un subítem sin línea principal
// antes, en su lote, no se guarda (AGENTS.md §2.1).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { blankLine } from "./components/lines/use-cv-lines-state";
import { prepareLineRecords } from "./line-records";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

const FX = { costFxRate: new Decimal("6.97"), saleFxRate: new Decimal("6.96") };
const CONTEXT = { hoursUnitIds: new Set<string>() };

const item = (overrides: Partial<CvLineDraft> = {}): CvLineDraft => ({
  ...blankLine("ITEM", null),
  areaId: "area-net",
  description: "Equipo",
  unitCostUsd: "100",
  factor: "2",
  ...overrides,
});

describe("prepareLineRecords con subítems", () => {
  it("guarda la marca de subítem de cada línea", () => {
    const result = prepareLineRecords(
      [],
      [item(), item({ isSubItem: true })],
      FX,
      CONTEXT,
    );
    expect(result.ok && result.records.map((r) => r.data.isSubItem)).toEqual([
      false,
      true,
    ]);
  });

  it("rechaza un subítem sin línea principal antes en su lote", () => {
    const result = prepareLineRecords(
      [{ key: "L1", id: null, name: "LOTE 1" }],
      [item(), item({ groupKey: "L1", isSubItem: true })],
      FX,
      CONTEXT,
    );
    expect(result).toEqual({
      ok: false,
      message:
        "Línea 2: un subítem necesita una línea principal antes, en el mismo lote.",
    });
  });
});
