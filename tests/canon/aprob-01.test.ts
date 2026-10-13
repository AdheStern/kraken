// tests/canon/aprob-01.test.ts
// Caso canónico APROB-01 (AGENTS.md §15.3): aprobación en paralelo con umbral del GG por versión.
// REGLA: no se edita sin cambiar antes la sección 15 de AGENTS.md (regla 13).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  computeApprovalTargets,
  decideInRound,
  type RoundRequest,
} from "@/domain/sales-control/approval-round";

const THRESHOLD = new Decimal("50000");
const DIMANET = "area-dimanet";
const DIMATEL = "area-dimatel";

function round(
  targets: ReturnType<typeof computeApprovalTargets>,
): RoundRequest[] {
  return targets.map((t) => ({
    id: t.kind === "AREA" ? t.areaId : "GG",
    status: "PENDIENTE",
  }));
}

function apply(
  requests: RoundRequest[],
  requestId: string,
  status: "APROBADA" | "RECHAZADA",
) {
  const outcome = decideInRound(requests, { requestId, status });
  if (!outcome) throw new Error(`no se pudo decidir ${requestId}`);
  const next = requests.map(
    (r) => outcome.updates.find((u) => u.id === r.id) ?? r,
  );
  return { outcome, next };
}

describe("APROB-01", () => {
  it("210LP-26 v1: 62,500 ≥ umbral → DIMANET, DIMATEL y GG; un rechazo la deja OBSERVADA", () => {
    const targets = computeApprovalTargets(
      [DIMANET, DIMATEL, DIMANET],
      new Decimal("62500"),
      THRESHOLD,
    );
    expect(targets).toEqual([
      { kind: "AREA", areaId: DIMANET },
      { kind: "AREA", areaId: DIMATEL },
      { kind: "GERENCIA_GENERAL" },
    ]);
    let requests = round(targets);
    ({ next: requests } = apply(requests, DIMANET, "APROBADA"));
    const gg = apply(requests, "GG", "APROBADA");
    expect(gg.outcome.round).toBe("EN_CURSO");
    const rejected = apply(gg.next, DIMATEL, "RECHAZADA");
    expect(rejected.outcome.round).toBe("OBSERVADA");
    // POR QUÉ: las decisiones previas se conservan y ninguna queda pendiente.
    expect(rejected.next.map((r) => [r.id, r.status])).toEqual([
      [DIMANET, "APROBADA"],
      [DIMATEL, "RECHAZADA"],
      ["GG", "APROBADA"],
    ]);
  });

  it("210LP-26 v2: 48,000 < umbral → solo DIMANET y DIMATEL; ambos aprueban → APROBADA", () => {
    const targets = computeApprovalTargets(
      [DIMANET, DIMATEL],
      new Decimal("48000"),
      THRESHOLD,
    );
    expect(targets).toEqual([
      { kind: "AREA", areaId: DIMANET },
      { kind: "AREA", areaId: DIMATEL },
    ]);
    const first = apply(round(targets), DIMANET, "APROBADA");
    expect(first.outcome.round).toBe("EN_CURSO");
    const second = apply(first.next, DIMATEL, "APROBADA");
    expect(second.outcome.round).toBe("APROBADA");
  });
});
