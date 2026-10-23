// tests/authz/dashboard-permissions.test.ts
// Tableros (AGENTS.md §2.9 fila "Tableros", §6): una prueba por celda de quién ve cada tablero, el alcance por
// línea de las ventas, las metas y de qué ingenieros se ve la utilización.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canEditGoal,
  canEditGoals,
  canSeeInventoryDashboard,
  canSeeOperationsDashboard,
  canSeeSalesDashboard,
} from "@/server/authz/dashboard-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeEngineerQuery } from "@/server/authz/scope-engineer-query";
import { scopeGoalQuery } from "@/server/authz/scope-goal-query";
import { scopeSalesLineQuery } from "@/server/authz/scope-sales-line-query";

const NOTHING = { id: { in: [] } };

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

const OWN_CVS = [
  { version: { cv: { createdById: "yo" } } },
  { version: { sellers: { some: { userId: "yo" } } } },
];

describe("§2.9 Tableros: quién ve cada uno", () => {
  it.each<[RoleCode, boolean, boolean, boolean]>([
    ["GERENTE_GENERAL", true, true, true],
    ["GERENTE_AREA", true, true, true],
    ["COMERCIAL", true, false, false],
    ["ADMINISTRACION", true, false, true],
    ["COORDINADOR_SOPORTE", false, true, false],
    ["INGENIERO", false, true, false],
    ["ALMACEN", false, false, true],
    ["PREVENTA", false, false, false],
    ["ADMIN_SISTEMA", false, false, false],
  ])("%s: ventas %s · operación %s · inventario %s", (role, sales, ops, inv) => {
    const u = user([role, "net"]);
    expect(canSeeSalesDashboard(u)).toBe(sales);
    expect(canSeeOperationsDashboard(u)).toBe(ops);
    expect(canSeeInventoryDashboard(u)).toBe(inv);
  });
});

describe("§2.9 Tableros: alcance de las ventas por línea", () => {
  it("el GG ve todas las líneas", () => {
    expect(scopeSalesLineQuery(user(["GERENTE_GENERAL"]))).toEqual({});
  });

  it("el comercial ve las líneas de los CV donde es vendedor o creador", () => {
    expect(scopeSalesLineQuery(user(["COMERCIAL"]))).toEqual({ OR: OWN_CVS });
  });

  it("el gerente de área ve las líneas de su área y sus propios CV", () => {
    expect(scopeSalesLineQuery(user(["GERENTE_AREA", "net"]))).toEqual({
      OR: [...OWN_CVS, { areaId: { in: ["net"] } }],
    });
  });

  it("Administración ve solo lo aprobado", () => {
    expect(scopeSalesLineQuery(user(["ADMINISTRACION"]))).toEqual({
      OR: [{ version: { status: { in: ["APROBADA", "REEMPLAZADA"] } } }],
    });
  });

  it.each<RoleCode>([
    "INGENIERO",
    "PREVENTA",
    "COORDINADOR_SOPORTE",
    "ALMACEN",
    "ADMIN_SISTEMA",
  ])("%s no ve ventas (el ingeniero nunca ve montos, regla 12)", (role) => {
    expect(scopeSalesLineQuery(user([role, "net"]))).toEqual(NOTHING);
  });
});

describe("§2.9 Tableros: metas", () => {
  it("el GG define todas y la de la empresa; el gerente, solo las de su área", () => {
    const gg = user(["GERENTE_GENERAL"]);
    const net = user(["GERENTE_AREA", "net"]);
    expect([canEditGoal(gg, null), canEditGoal(gg, "tel")]).toEqual([
      true,
      true,
    ]);
    expect([
      canEditGoal(net, "net"),
      canEditGoal(net, "tel"),
      canEditGoal(net, null),
    ]).toEqual([true, false, false]);
    expect([canEditGoals(gg), canEditGoals(net)]).toEqual([true, true]);
    expect(canEditGoals(user(["ADMINISTRACION"]))).toBe(false);
  });

  it("ven las metas el GG y Administración (todas) y el gerente (su área)", () => {
    expect(scopeGoalQuery(user(["GERENTE_GENERAL"]))).toEqual({});
    expect(scopeGoalQuery(user(["ADMINISTRACION"]))).toEqual({});
    expect(scopeGoalQuery(user(["GERENTE_AREA", "net"]))).toEqual({
      areaId: { in: ["net"] },
    });
    expect(scopeGoalQuery(user(["COMERCIAL"]))).toEqual(NOTHING);
  });
});

describe("§2.9 Tableros: utilización de ingenieros", () => {
  const ofArea = (areaIds: string[]) => ({
    roles: { some: { role: { code: "INGENIERO" }, areaId: { in: areaIds } } },
  });

  it("el GG ve a todos los ingenieros", () => {
    expect(scopeEngineerQuery(user(["GERENTE_GENERAL"]))).toEqual({
      roles: { some: { role: { code: "INGENIERO" } } },
    });
  });

  it("gerente y coordinador ven a los de sus áreas; el ingeniero, solo a sí mismo", () => {
    expect(
      scopeEngineerQuery(
        user(["GERENTE_AREA", "net"], ["COORDINADOR_SOPORTE", "tel"]),
      ),
    ).toEqual({ OR: [ofArea(["net", "tel"])] });
    expect(scopeEngineerQuery(user(["INGENIERO", "net"]))).toEqual({
      OR: [{ userId: "yo" }],
    });
    expect(scopeEngineerQuery(user(["COMERCIAL"]))).toEqual({
      userId: { in: [] },
    });
  });
});
