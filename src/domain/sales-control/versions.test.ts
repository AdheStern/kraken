// src/domain/sales-control/versions.test.ts
// Máquina de estados de la versión, casos borde de la ronda y comparador de versiones.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { computeApprovalTargets, decideInRound } from "./approval-round";
import { type ComparableLine, compareVersionLines } from "./compare-versions";
import { canStartNewVersion, nextVersionState } from "./version-state-machine";

describe("version-state-machine", () => {
  it.each([
    ["BORRADOR", "ENVIAR", "EN_APROBACION"],
    ["EN_APROBACION", "APROBAR_RONDA", "APROBADA"],
    ["EN_APROBACION", "OBSERVAR", "OBSERVADA"],
    ["APROBADA", "REEMPLAZAR", "REEMPLAZADA"],
    ["BORRADOR", "ANULAR", "ANULADA"],
    ["APROBADA", "ANULAR", "ANULADA"],
  ] as const)("%s + %s → %s", (from, event, to) => {
    expect(nextVersionState(from, event)).toBe(to);
  });

  it.each([
    ["APROBADA", "ENVIAR"],
    ["EN_APROBACION", "ANULAR"],
    ["OBSERVADA", "APROBAR_RONDA"],
    ["REEMPLAZADA", "ANULAR"],
  ] as const)("%s no admite %s", (from, event) => {
    expect(nextVersionState(from, event)).toBeNull();
  });

  it("solo se abre una versión nueva desde APROBADA u OBSERVADA", () => {
    expect(canStartNewVersion("APROBADA")).toBe(true);
    expect(canStartNewVersion("OBSERVADA")).toBe(true);
    expect(canStartNewVersion("BORRADOR")).toBe(false);
    expect(canStartNewVersion("EN_APROBACION")).toBe(false);
  });
});

describe("decideInRound", () => {
  const requests = [
    { id: "a", status: "PENDIENTE" as const },
    { id: "b", status: "PENDIENTE" as const },
  ];

  it("una solicitud ya decidida o inexistente no se puede decidir", () => {
    expect(
      decideInRound([{ id: "a", status: "APROBADA" }], {
        requestId: "a",
        status: "APROBADA",
      }),
    ).toBeNull();
    expect(
      decideInRound(requests, { requestId: "x", status: "APROBADA" }),
    ).toBeNull();
  });

  it("si el rechazo no cerrara la ronda, la observación llega al decidir la última", () => {
    const options = { rejectionClosesRound: false };
    const first = decideInRound(
      requests,
      { requestId: "a", status: "RECHAZADA" },
      options,
    );
    expect(first?.round).toBe("EN_CURSO");
    const last = decideInRound(
      [{ id: "a", status: "RECHAZADA" }, requests[1]],
      { requestId: "b", status: "APROBADA" },
      options,
    );
    expect(last?.round).toBe("OBSERVADA");
  });

  it("el umbral se alcanza con igualdad exacta", () => {
    expect(
      computeApprovalTargets(
        ["x"],
        new Decimal("50000.00"),
        new Decimal("50000"),
      ),
    ).toHaveLength(2);
    expect(
      computeApprovalTargets([], new Decimal("10"), new Decimal("50000")),
    ).toEqual([]);
  });
});

describe("compareVersionLines", () => {
  const line = (
    code: string | null,
    description: string,
    fields: Record<string, string> = {},
  ): ComparableLine => ({ code, description, fields });

  it("detecta agregadas, quitadas, modificadas e iguales", () => {
    const before = [
      line("A", "Switch", { cantidad: "2" }),
      line("B", "Router"),
      line(null, "Servicio", { venta: "100" }),
    ];
    const after = [
      line("A", "Switch", { cantidad: "3" }),
      line(null, "servicio ", { venta: "100" }),
      line("C", "Firewall"),
    ];
    const result = compareVersionLines(before, after);
    expect(result.map((r) => r.status)).toEqual([
      "MODIFICADA",
      "MODIFICADA",
      "AGREGADA",
      "QUITADA",
    ]);
    expect(result[0]).toMatchObject({
      changes: [{ field: "cantidad", before: "2", after: "3" }],
    });
    expect(result[1]).toMatchObject({ changes: [{ field: "description" }] });
  });

  it("líneas repetidas con el mismo código se emparejan por orden", () => {
    const before = [
      line("X", "Licencia", { cantidad: "1" }),
      line("X", "Licencia", { cantidad: "5" }),
    ];
    const after = [
      line("X", "Licencia", { cantidad: "1" }),
      line("X", "Licencia", { cantidad: "5" }),
    ];
    expect(compareVersionLines(before, after).map((r) => r.status)).toEqual([
      "IGUAL",
      "IGUAL",
    ]);
  });
});
