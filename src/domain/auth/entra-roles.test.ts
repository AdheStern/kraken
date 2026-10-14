// src/domain/auth/entra-roles.test.ts
// Grupos de Entra → roles (AGENTS.md ADR-05): lectura del claim y cruce con el mapeo.
import { describe, expect, it } from "vitest";
import { computeEntraRoles, readGroupClaim, roleKey } from "./entra-roles";

const G_NET = "11111111-aaaa-4bbb-8ccc-000000000001";
const G_HELP = "11111111-aaaa-4bbb-8ccc-000000000002";

describe("readGroupClaim", () => {
  it("lee los id de grupo del token", () => {
    expect(readGroupClaim({ groups: [G_NET, 42, G_HELP] })).toEqual({
      kind: "groups",
      groupIds: [G_NET, G_HELP],
    });
  });

  it("sin claim, o sin token legible, no hay grupos", () => {
    expect(readGroupClaim({ name: "Ana" })).toEqual({
      kind: "groups",
      groupIds: [],
    });
    expect(readGroupClaim(null)).toEqual({ kind: "groups", groupIds: [] });
    expect(readGroupClaim("x")).toEqual({ kind: "groups", groupIds: [] });
  });

  it("detecta el overage de Entra", () => {
    expect(
      readGroupClaim({ _claim_names: { groups: "src1" }, _claim_sources: {} }),
    ).toEqual({ kind: "overage" });
  });
});

describe("computeEntraRoles", () => {
  const mappings = [
    { entraGroupId: G_NET, roleId: "gerente", areaId: "net" },
    { entraGroupId: G_NET.toUpperCase(), roleId: "gerente", areaId: "net" },
    { entraGroupId: G_HELP, roleId: "ingeniero", areaId: "help" },
    { entraGroupId: "otro", roleId: "gg", areaId: null },
  ];

  it("da los roles de los grupos de la persona, sin repetir y sin distinguir mayúsculas", () => {
    expect(computeEntraRoles([G_NET], mappings)).toEqual([
      { roleId: "gerente", areaId: "net" },
    ]);
    expect(
      computeEntraRoles([G_NET, G_HELP.toUpperCase()], mappings),
    ).toHaveLength(2);
  });

  it("sin grupos mapeados no da roles", () => {
    expect(computeEntraRoles([], mappings)).toEqual([]);
    expect(computeEntraRoles(["sin-mapeo"], mappings)).toEqual([]);
  });

  it("la clave de un rol distingue el área", () => {
    expect(roleKey({ roleId: "r", areaId: null })).not.toBe(
      roleKey({ roleId: "r", areaId: "a" }),
    );
  });
});
