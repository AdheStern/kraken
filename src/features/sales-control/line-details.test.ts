// src/features/sales-control/line-details.test.ts
// Detalles de una línea: vigencia, seriales, bolsa de horas (§2.4, regla 4) y alta en catálogo.
import { describe, expect, it } from "vitest";
import { blankLine } from "./components/lines/use-cv-lines-state";
import {
  lineDetailIssues,
  needsHourBag,
  parseHourBagSpec,
} from "./line-details";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

const HOURS = "unit-horas";
const context = { hoursUnitIds: new Set([HOURS]) };
const line = (overrides: Partial<CvLineDraft>) => ({
  ...blankLine("ITEM", null),
  ...overrides,
});
const fields = (l: CvLineDraft) =>
  lineDetailIssues(l, context).map((issue) => issue.field);
const hourService = { unitId: HOURS, itemType: "SERVICIO" as const };
const bag = {
  modality: "H8X5" as const,
  scope: "AREA" as const,
  areaIds: ["a"],
  projectId: null,
  expiresOn: "",
};

describe("lineDetailIssues", () => {
  it("una línea sin detalles no tiene problemas", () => {
    expect(fields(line({}))).toEqual([]);
  });

  it("vigencia invertida, seriales repetidos o de más", () => {
    expect(
      fields(line({ coverageStart: "2026-12-01", coverageEnd: "2026-01-01" })),
    ).toEqual(["coverageEnd"]);
    expect(fields(line({ quantity: "3", serials: ["A", "A"] }))).toEqual([
      "serials",
    ]);
    expect(fields(line({ quantity: "1", serials: ["A", "B"] }))).toEqual([
      "serials",
    ]);
  });

  it("HORAS + SERVICIO exige bolsa con modalidad y áreas", () => {
    const service = line({ ...hourService, quantity: "20" });
    expect(needsHourBag(service, context)).toBe(true);
    expect(fields(service)).toEqual(["hourBag"]);
    expect(fields({ ...service, hourBag: { ...bag, areaIds: [] } })).toEqual([
      "hourBag",
    ]);
    expect(
      fields({ ...service, hourBag: { ...bag, scope: "PROYECTO" } }),
    ).toEqual(["hourBag"]);
    expect(fields({ ...service, hourBag: bag })).toEqual([]);
    expect(
      fields({
        ...service,
        hourBag: { ...bag, scope: "GENERAL", areaIds: [] },
      }),
    ).toEqual([]);
  });

  it("las horas deben dar minutos enteros (regla 4)", () => {
    expect(
      fields(line({ ...hourService, quantity: "1.25", hourBag: bag })),
    ).toEqual([]);
    expect(
      fields(line({ ...hourService, quantity: "1.01", hourBag: bag })),
    ).toEqual(["quantity"]);
  });

  it("una línea de horas que no es servicio no lleva bolsa", () => {
    expect(
      needsHourBag(line({ unitId: HOURS, itemType: "INTANGIBLE" }), context),
    ).toBe(false);
  });

  it("agregar al catálogo exige código y tipo", () => {
    expect(fields(line({ saveAsProduct: true }))).toEqual(["saveAsProduct"]);
    expect(
      fields(line({ saveAsProduct: true, code: "X-1", itemType: "HARDWARE" })),
    ).toEqual([]);
  });

  it("las notas no tienen detalles", () => {
    expect(
      lineDetailIssues(
        { ...blankLine("NOTA", null), serials: ["A", "A"] },
        context,
      ),
    ).toEqual([]);
  });
});

describe("parseHourBagSpec", () => {
  it("acepta la especificación válida y descarta la inválida", () => {
    expect(parseHourBagSpec(bag)).toEqual(bag);
    expect(parseHourBagSpec({ modality: "X" })).toBeNull();
    expect(parseHourBagSpec(null)).toBeNull();
    expect(parseHourBagSpec({ ...bag, expiresOn: null })).toEqual(bag);
  });
});
