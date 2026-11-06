// tests/authz/contact-permissions.test.ts
// Directorio de contactos (decisión 2026-11-06): lo ven quienes gestionan el catálogo, comerciales, preventa y
// gerencia; ni el ingeniero, ni Almacén, ni una cuenta del portal.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import { canBrowseContacts } from "@/server/authz/contact-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";

function user(...roles: RoleCode[]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map((code) => ({ code, areaId: null })),
  };
}

describe("directorio de contactos", () => {
  it.each<RoleCode>([
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
    "COMERCIAL",
    "PREVENTA",
    "GERENTE_AREA",
    "GERENTE_GENERAL",
  ])("%s lo ve", (role) => {
    expect(canBrowseContacts(user(role))).toBe(true);
    expect(scopeContactQuery(user(role))).toEqual({});
  });

  it.each<RoleCode>([
    "INGENIERO",
    "COORDINADOR_SOPORTE",
    "ALMACEN",
  ])("%s no lo ve", (role) => {
    expect(canBrowseContacts(user(role))).toBe(false);
    expect(scopeContactQuery(user(role))).toEqual({ id: { in: [] } });
  });

  it("una cuenta del portal nunca lo ve", () => {
    const client: SessionUser = {
      ...user("CLIENTE"),
      customer: {
        customerId: "c",
        seesBags: false,
        requestsWork: false,
        comments: false,
      },
    };
    expect(canBrowseContacts(client)).toBe(false);
  });
});
