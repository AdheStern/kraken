// src/features/sales-control/schemas/cv-leasing-schema.test.ts
// Seriales del leasing escritos en la fila (AGENTS.md §2.1, decisión 2026-11-10): se parten y se validan al guardar.
import { describe, expect, it } from "vitest";
import {
  parseLeasingSerials,
  serialsIssue,
  upsertCvLeasingSchema,
} from "./cv-leasing-schema";

const line = (serials: string, quantity = "2") => ({
  key: "k",
  id: null,
  supplierId: null,
  technologyId: null,
  code: "",
  description: "UPS",
  quantity,
  unitCostUsd: "10",
  notes: "",
  serials,
  poNumber: "",
});
const VERSION_ID = "0195f0e0-0000-7000-8000-000000000000";

describe("parseLeasingSerials", () => {
  it("parte por coma, punto y coma o salto de línea y descarta vacíos", () => {
    expect(parseLeasingSerials(" FOC1, FOC2;FOC3\n\n , ")).toEqual([
      "FOC1",
      "FOC2",
      "FOC3",
    ]);
    expect(parseLeasingSerials("")).toEqual([]);
  });
});

describe("serialsIssue", () => {
  it("rechaza repetidos y más seriales que la cantidad", () => {
    expect(serialsIssue(["A", "A"], "5")).toMatch(/repetidos/);
    expect(serialsIssue(["A", "B", "C"], "2")).toMatch(/cantidad/);
    expect(serialsIssue(["A", "B"], "2")).toBeNull();
  });

  it("sin cantidad no limita el número de seriales", () => {
    expect(serialsIssue(["A", "B", "C"], null)).toBeNull();
  });
});

describe("upsertCvLeasingSchema", () => {
  it("valida los seriales de cada fila", () => {
    const ok = upsertCvLeasingSchema.safeParse({
      versionId: VERSION_ID,
      lines: [line("S1, S2")],
    });
    const tooMany = upsertCvLeasingSchema.safeParse({
      versionId: VERSION_ID,
      lines: [line("S1, S2, S3")],
    });
    expect(ok.success).toBe(true);
    expect(tooMany.success).toBe(false);
  });
});
