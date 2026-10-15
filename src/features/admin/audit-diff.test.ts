// src/features/admin/audit-diff.test.ts
// Lectura de un evento de auditoría (ADR-14): solo los campos que cambiaron, con vacíos y sí/no legibles.
import { describe, expect, it } from "vitest";
import { toAuditDiff } from "./audit-diff";

describe("toAuditDiff", () => {
  it("muestra solo lo que cambió, con los campos de ambos lados", () => {
    expect(
      toAuditDiff(
        { name: "Cisco", isActive: true, code: "X" },
        { name: "CISCO", isActive: true, taxId: "123" },
      ),
    ).toEqual([
      { field: "name", before: "Cisco", after: "CISCO" },
      { field: "code", before: "X", after: "—" },
      { field: "taxId", before: "—", after: "123" },
    ]);
  });

  it("lee booleanos, vacíos, listas y eventos sin antes", () => {
    expect(
      toAuditDiff(null, { isActive: false, roles: [1, 2], note: null }),
    ).toEqual([
      { field: "isActive", before: "—", after: "no" },
      { field: "roles", before: "—", after: "[1,2]" },
    ]);
  });
});
