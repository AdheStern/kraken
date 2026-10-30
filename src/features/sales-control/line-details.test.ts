// src/features/sales-control/line-details.test.ts
// Detalles de una línea: vigencia, seriales, bolsa de horas o contrato por vigencia (§2.4, regla 4) y alta en catálogo.
import { describe, expect, it } from "vitest";
import { blankLine } from "./components/lines/use-cv-lines-state";
import {
  lineDetailIssues,
  needsHourBag,
  parseHourBagSpec,
} from "./line-details";
import type { CvLineDraft } from "./schemas/cv-lines-schema";

const HOURS = "unit-horas";
const YEARS = "unit-anios";
const context = {
  hoursUnitIds: new Set([HOURS]),
  termUnitIds: new Set([YEARS]),
};
const line = (overrides: Partial<CvLineDraft>) => ({
  ...blankLine("ITEM", null),
  ...overrides,
});
const fields = (l: CvLineDraft) =>
  lineDetailIssues(l, context).map((issue) => issue.field);
const hourService = { unitId: HOURS, itemType: "SERVICIO" as const };
const bag = {
  kind: "HORAS" as const,
  capHours: null,
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

  it("rango de activación de una licencia: opcional, completo y en orden", () => {
    const license = { itemType: "INTANGIBLE" as const };
    expect(lineDetailIssues(line(license), context)).toEqual([]);
    expect(fields(line({ ...license, activationStart: "2026-11-01" }))).toEqual(
      ["activationEnd"],
    );
    expect(
      fields(
        line({
          ...license,
          activationStart: "2026-11-15",
          activationEnd: "2026-11-01",
        }),
      ),
    ).toEqual(["activationEnd"]);
    expect(
      fields(
        line({
          ...license,
          activationStart: "2026-11-01",
          activationEnd: "2026-11-01",
        }),
      ),
    ).toEqual([]);
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

describe("CV de saldo inicial (§14, F2)", () => {
  const opening = { ...context, isOpeningBalance: true };
  const openingFields = (l: CvLineDraft) =>
    lineDetailIssues(l, opening).map((issue) => issue.field);
  const hours = line({
    ...hourService,
    hourBag: bag,
    quantity: "20",
    unitCostUsd: "0",
    unitSaleUsd: "0.00",
  });

  it("acepta horas de servicio con costo y venta 0", () => {
    expect(openingFields(hours)).toEqual([]);
  });

  it("rechaza otras líneas y cualquier venta o costo", () => {
    expect(
      openingFields(line({ unitId: "unit-pieza", itemType: "HARDWARE" })),
    ).toEqual(["unitId"]);
    expect(openingFields({ ...hours, unitSaleUsd: "50" })).toEqual([
      "unitSaleUsd",
    ]);
    expect(openingFields({ ...hours, unitCostUsd: "10" })).toEqual([
      "unitSaleUsd",
    ]);
  });

  it("admite notas y no aplica fuera de un CV de saldo inicial", () => {
    expect(lineDetailIssues(blankLine("NOTA", null), opening)).toEqual([]);
    expect(fields({ ...hours, unitSaleUsd: "50" })).toEqual([]);
  });
});

describe("contrato por vigencia", () => {
  const yearService = line({
    unitId: YEARS,
    itemType: "SERVICIO",
    quantity: "1",
  });
  const contract = { ...bag, kind: "VIGENCIA" as const };

  it("una línea de servicio en años sin marcar no es bolsa; marcada exige la vigencia", () => {
    expect(needsHourBag(yearService, context)).toBe(false);
    expect(fields(yearService)).toEqual([]);
    expect(fields({ ...yearService, hourBag: contract })).toEqual([
      "coverageStart",
    ]);
    expect(
      fields({
        ...yearService,
        hourBag: contract,
        coverageStart: "2026-11-01",
        coverageEnd: "2027-10-31",
      }),
    ).toEqual([]);
  });

  it("el tope es opcional pero, si va, son horas mayores a 0 en minutos enteros", () => {
    const dated = {
      ...yearService,
      coverageStart: "2026-11-01",
      coverageEnd: "2027-10-31",
    };
    const withCap = (capHours: string) =>
      fields({ ...dated, hourBag: { ...contract, capHours } });
    expect(withCap("40")).toEqual([]);
    expect(withCap("12.5")).toEqual([]);
    expect(withCap("0")).toEqual(["hourBag"]);
    expect(withCap("1.01")).toEqual(["hourBag"]);
  });
});
