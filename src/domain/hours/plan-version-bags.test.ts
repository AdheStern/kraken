// src/domain/hours/plan-version-bags.test.ts
// Bolsas al aprobar una versión: abrir, ajustar, cerrar, re-enlazar y saldos insuficientes (AGENTS.md §2.4).
import { describe, expect, it } from "vitest";
import { findBagShortfalls } from "./check-version-bag-balances";
import {
  type BagSpec,
  type CurrentBag,
  planVersionBags,
  type VersionHourLine,
} from "./plan-version-bags";

const SPEC: BagSpec = {
  modality: "H8X5",
  scope: "AREA",
  areaIds: ["dimanet"],
  projectId: null,
  expiresOn: "2027-06-30",
};

const line = (
  lineId: string,
  minutes: number,
  originLineId: string | null = null,
  spec: BagSpec = SPEC,
): VersionHourLine => ({ lineId, originLineId, minutes, spec });

const bag = (patch: Partial<CurrentBag> = {}): CurrentBag => ({
  bagId: "bag-1",
  rootLineId: "v1-a",
  status: "ACTIVA",
  lineMinutes: 1200,
  balanceMinutes: 900,
  ...patch,
});

describe("planVersionBags", () => {
  it("la v1 abre una bolsa por línea de horas", () => {
    const plan = planVersionBags([line("v1-a", 1200), line("v1-b", 600)], []);
    expect(plan.issues).toEqual([]);
    expect(plan.ops).toEqual([
      { kind: "OPEN", lineId: "v1-a", minutes: 1200, spec: SPEC },
      { kind: "OPEN", lineId: "v1-b", minutes: 600, spec: SPEC },
    ]);
  });

  it("la v2 con +10 h ajusta +600 y lleva los atributos nuevos", () => {
    const spec24 = { ...SPEC, modality: "H24X7" as const };
    const plan = planVersionBags([line("v2-a", 1800, "v1-a", spec24)], [bag()]);
    expect(plan.ops).toEqual([
      {
        kind: "ADJUST",
        bagId: "bag-1",
        lineId: "v2-a",
        deltaMinutes: 600,
        spec: spec24,
      },
    ]);
  });

  it("mide el delta contra la línea aprobada, no contra lo vendido (respeta ajustes manuales)", () => {
    const plan = planVersionBags(
      [line("v2-a", 1200, "v1-a")],
      [bag({ balanceMinutes: 1500 })],
    );
    expect(plan.ops).toMatchObject([{ kind: "ADJUST", deltaMinutes: 0 }]);
  });

  it("quitar la línea cierra la bolsa por su saldo", () => {
    const plan = planVersionBags(
      [],
      [bag({ status: "AGOTADA", balanceMinutes: 0 })],
    );
    expect(plan.ops).toEqual([
      { kind: "CLOSE", bagId: "bag-1", deltaMinutes: 0 },
    ]);
  });

  it("una línea nueva en la v2 abre otra bolsa y conserva la existente", () => {
    const plan = planVersionBags(
      [line("v2-a", 1200, "v1-a"), line("v2-new", 300)],
      [bag()],
    );
    expect(plan.ops.map((op) => op.kind)).toEqual(["ADJUST", "OPEN"]);
  });

  it("si dos líneas comparten linaje, solo la primera toma la bolsa", () => {
    const plan = planVersionBags(
      [line("v2-a", 1200, "v1-a"), line("v2-b", 300, "v1-a")],
      [bag()],
    );
    expect(plan.ops.map((op) => op.kind)).toEqual(["ADJUST", "OPEN"]);
  });

  it("una bolsa vencida sin cambio de horas solo se re-enlaza", () => {
    const plan = planVersionBags(
      [line("v2-a", 1200, "v1-a")],
      [bag({ status: "VENCIDA", balanceMinutes: 0 })],
    );
    expect(plan.ops).toEqual([
      { kind: "RELINK", bagId: "bag-1", lineId: "v2-a" },
    ]);
  });

  it("una bolsa vencida o cerrada no acepta un cambio de horas", () => {
    const plan = planVersionBags(
      [line("v2-a", 1500, "v1-a")],
      [bag({ status: "CERRADA", balanceMinutes: 0 })],
    );
    expect(plan.ops).toEqual([]);
    expect(plan.issues).toEqual([
      {
        kind: "TERMINAL_BAG_CHANGED",
        lineId: "v2-a",
        bagId: "bag-1",
        status: "CERRADA",
      },
    ]);
  });

  it("no cierra otra vez una bolsa terminal cuya línea se quitó", () => {
    expect(planVersionBags([], [bag({ status: "VENCIDA" })]).ops).toEqual([]);
  });

  it.each([1.5, -60])("rechaza minutos de línea inválidos (%s)", (minutes) => {
    expect(() => planVersionBags([line("v1-a", minutes)], [])).toThrow(
      RangeError,
    );
  });
});

describe("findBagShortfalls", () => {
  it("bloquea una reducción mayor que el saldo y deja pasar el resto", () => {
    const bags = [bag(), bag({ bagId: "bag-2", rootLineId: "v1-b" })];
    const { ops } = planVersionBags(
      [line("v2-a", 200, "v1-a"), line("v2-b", 400, "v1-b"), line("v2-c", 60)],
      bags,
    );
    expect(findBagShortfalls(ops, bags)).toEqual([
      {
        bagId: "bag-1",
        lineId: "v2-a",
        balanceMinutes: 900,
        deltaMinutes: -1000,
      },
    ]);
  });

  it("reducir exactamente hasta el saldo está permitido", () => {
    const bags = [bag()];
    const { ops } = planVersionBags([line("v2-a", 300, "v1-a")], bags);
    expect(findBagShortfalls(ops, bags)).toEqual([]);
  });

  it("falla si un ajuste apunta a una bolsa que no recibió", () => {
    expect(() =>
      findBagShortfalls(
        [
          {
            kind: "ADJUST",
            bagId: "ghost",
            lineId: "x",
            deltaMinutes: -1,
            spec: SPEC,
          },
        ],
        [],
      ),
    ).toThrow();
  });
});
