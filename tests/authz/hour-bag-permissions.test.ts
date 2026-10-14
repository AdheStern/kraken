// tests/authz/hour-bag-permissions.test.ts
// Bolsas de horas (AGENTS.md §2.9): una prueba por celda de "Bolsas: ver saldo" y "Bolsas: ajuste manual".
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canAdjustHourBag,
  canSeeHourBags,
} from "@/server/authz/hour-bag-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

describe("§2.9 Bolsas: ver saldo", () => {
  it.each<RoleCode>([
    "GERENTE_GENERAL",
    "ADMINISTRACION",
  ])("%s ve todas", (role) => {
    expect(scopeHourBagQuery(user([role]))).toEqual({});
  });

  it("el gerente de área ve las de sus áreas", () => {
    expect(scopeHourBagQuery(user(["GERENTE_AREA", "net"]))).toEqual({
      OR: [{ areas: { some: { areaId: { in: ["net"] } } } }],
    });
  });

  it("el comercial ve las de sus CV (creador o vendedor)", () => {
    const scope = scopeHourBagQuery(user(["COMERCIAL"]));
    expect(JSON.stringify(scope)).toContain('"createdById":"yo"');
    expect(JSON.stringify(scope)).toContain(
      '"sellers":{"some":{"userId":"yo"}}',
    );
  });

  it("el ingeniero ve las de sus tickets (a cargo o con subtarea suya)", () => {
    const scope = JSON.stringify(scopeHourBagQuery(user(["INGENIERO"])));
    expect(scope).toContain('"ownerId":"yo"');
    expect(scope).toContain('"assigneeId":"yo"');
  });

  it.each<RoleCode>([
    "COORDINADOR_SOPORTE",
    "PREVENTA",
    "INGENIERO",
  ])("todo miembro del área (%s con área) ve todas sus bolsas", (role) => {
    const scope = scopeHourBagQuery(user([role, "help"]));
    expect(scope.OR?.[0]).toEqual({
      areas: { some: { areaId: { in: ["help"] } } },
    });
    expect(canSeeHourBags(user([role, "help"]))).toBe(true);
  });

  it("las áreas de varios roles se suman sin repetirse", () => {
    expect(
      scopeHourBagQuery(
        user(
          ["GERENTE_AREA", "net"],
          ["INGENIERO", "net"],
          ["PREVENTA", "tel"],
        ),
      ),
    ).toEqual({
      OR: [
        { areas: { some: { areaId: { in: ["net", "tel"] } } } },
        expect.anything(),
      ],
    });
  });

  it("los permisos se suman", () => {
    const scope = scopeHourBagQuery(
      user(["COMERCIAL"], ["GERENTE_AREA", "net"]),
    );
    expect(scope.OR).toHaveLength(2);
  });

  it.each<RoleCode>([
    "ALMACEN",
    "PREVENTA",
    "ADMIN_SISTEMA",
  ])("%s no ve ninguna ni entra al módulo", (role) => {
    expect(scopeHourBagQuery(user([role]))).toEqual({ id: { in: [] } });
    expect(canSeeHourBags(user([role]))).toBe(false);
  });
});

describe("§2.9 Bolsas: ajuste manual", () => {
  const bag = { areaIds: ["net", "tel"] };

  it("el GG ajusta todas", () => {
    expect(canAdjustHourBag(user(["GERENTE_GENERAL"]), bag)).toBe(true);
  });

  it("el gerente de área ajusta las de su área y no las de otra", () => {
    expect(canAdjustHourBag(user(["GERENTE_AREA", "tel"]), bag)).toBe(true);
    expect(canAdjustHourBag(user(["GERENTE_AREA", "doc"]), bag)).toBe(false);
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "INGENIERO",
    "ADMINISTRACION",
    "COORDINADOR_SOPORTE",
  ])("%s no ajusta", (role) => {
    expect(canAdjustHourBag(user([role, "net"]), bag)).toBe(false);
  });
});
