// tests/authz/inventory-permissions.test.ts
// Inventario (AGENTS.md §2.9): una prueba por celda de la fila "Inventario" más las decisiones de la F4 (costos,
// operación, decisión de ajustes, traspasos y reservas).
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canDecideAdjustment,
  canDecideAdjustments,
  canOperateInventory,
  canSeeInventory,
  canSeeInventoryCosts,
} from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeAdjustmentRequestQuery } from "@/server/authz/scope-adjustment-request-query";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { scopeReservationQuery } from "@/server/authz/scope-reservation-query";
import { scopeStockQuery } from "@/server/authz/scope-stock-query";
import { scopeTransferQuery } from "@/server/authz/scope-transfer-query";

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

describe("§2.9 Inventario: consulta de stock", () => {
  it.each<[RoleCode, string?]>([
    ["COMERCIAL"],
    ["GERENTE_AREA", "net"],
    ["GERENTE_GENERAL"],
    ["INGENIERO"],
    ["ADMINISTRACION"],
    ["ALMACEN"],
  ])("%s consulta el stock de todos los almacenes", (...role) => {
    expect(canSeeInventory(user(role))).toBe(true);
    expect(scopeStockQuery(user(role))).toEqual({});
  });

  it.each<RoleCode>([
    "PREVENTA",
    "COORDINADOR_SOPORTE",
    "ADMIN_SISTEMA",
  ])("%s no consulta inventario", (role) => {
    expect(canSeeInventory(user([role]))).toBe(false);
    expect(scopeStockQuery(user([role]))).toEqual(NOTHING);
  });
});

describe("§2.9 Inventario: costos y kardex", () => {
  it.each<[RoleCode, string?]>([
    ["ALMACEN"],
    ["ADMINISTRACION"],
    ["GERENTE_GENERAL"],
    ["GERENTE_AREA", "net"],
  ])("%s ve costos y kardex", (...role) => {
    expect(canSeeInventoryCosts(user(role))).toBe(true);
    expect(scopeInvMovementQuery(user(role))).toEqual({});
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "INGENIERO",
    "ADMIN_SISTEMA",
  ])("%s nunca recibe costos ni kardex (regla 12)", (role) => {
    expect(canSeeInventoryCosts(user([role]))).toBe(false);
    expect(scopeInvMovementQuery(user([role]))).toEqual(NOTHING);
  });
});

describe("§2.9 Inventario: operar (ingresos, salidas, POS, traspasos, conteos)", () => {
  it.each<RoleCode>([
    "ALMACEN",
    "ADMINISTRACION",
    "GERENTE_GENERAL",
  ])("%s opera todos los almacenes", (role) => {
    expect(canOperateInventory(user([role]))).toBe(true);
    expect(scopeTransferQuery(user([role]))).toEqual({});
  });

  it.each<[RoleCode, string?]>([
    ["GERENTE_AREA", "net"],
    ["COMERCIAL"],
    ["INGENIERO"],
  ])("%s solo consulta", (...role) => {
    expect(canOperateInventory(user(role))).toBe(false);
    expect(scopeTransferQuery(user(role))).toEqual(NOTHING);
  });
});

describe("§2.9 Inventario: aprobar ajustes", () => {
  const request = (areaId: string | null) => ({
    areaId,
    requestedById: "otro",
  });

  it("el gerente de área aprueba los de su área, no los de otra ni los sin área", () => {
    const gerente = user(["GERENTE_AREA", "net"]);
    expect(canDecideAdjustment(gerente, request("net"))).toBe(true);
    expect(canDecideAdjustment(gerente, request("tel"))).toBe(false);
    expect(canDecideAdjustment(gerente, request(null))).toBe(false);
    expect(scopeAdjustmentRequestQuery(gerente)).toEqual({
      areaId: { in: ["net"] },
    });
  });

  it.each<RoleCode>([
    "ADMINISTRACION",
    "GERENTE_GENERAL",
  ])("%s aprueba cualquiera, también sin área", (role) => {
    expect(canDecideAdjustment(user([role]), request(null))).toBe(true);
    expect(canDecideAdjustments(user([role]))).toBe(true);
  });

  it("nadie decide su propia solicitud", () => {
    const own = { areaId: null, requestedById: "yo" };
    expect(canDecideAdjustment(user(["GERENTE_GENERAL"]), own)).toBe(false);
  });

  it.each<RoleCode>([
    "ALMACEN",
    "COMERCIAL",
    "INGENIERO",
  ])("%s no aprueba ajustes", (role) => {
    expect(canDecideAdjustment(user([role]), request(null))).toBe(false);
    expect(canDecideAdjustments(user([role]))).toBe(false);
  });

  it("almacén ve todas las solicitudes; el comercial ninguna", () => {
    expect(scopeAdjustmentRequestQuery(user(["ALMACEN"]))).toEqual({});
    expect(scopeAdjustmentRequestQuery(user(["COMERCIAL"]))).toEqual(NOTHING);
  });
});

describe("Inventario: reservas", () => {
  it("quien opera ve todas; el gerente las de su área; el comercial las de sus CV", () => {
    expect(scopeReservationQuery(user(["ALMACEN"]))).toEqual({});
    expect(scopeReservationQuery(user(["GERENTE_AREA", "net"]))).toEqual({
      OR: [{ cvLine: { areaId: { in: ["net"] } } }],
    });
    const scope = JSON.stringify(scopeReservationQuery(user(["COMERCIAL"])));
    expect(scope).toContain('"createdById":"yo"');
    expect(scope).toContain('"sellers":{"some":{"userId":"yo"}}');
    expect(scopeReservationQuery(user(["INGENIERO"]))).toEqual(NOTHING);
  });
});
