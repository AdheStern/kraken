// tests/authz/contact-permissions.test.ts
// Clientes y contactos (decisión 2026-11-06): gestionan GG, gerentes de área, Desarrollo de Negocios,
// Administración y el administrador del sistema; el resto crea contactos y ve los de sus áreas; el portal, nada.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canCreateContacts,
  canManageContacts,
  canManageCustomers,
} from "@/server/authz/contact-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";

function user(code: RoleCode, areaId: string | null = null): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: [{ code, areaId }],
  };
}

describe("clientes y contactos", () => {
  it.each<RoleCode>([
    "GERENTE_GENERAL",
    "DESARROLLO_NEGOCIOS",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s gestiona clientes y contactos y los ve todos", (role) => {
    expect(canManageCustomers(user(role))).toBe(true);
    expect(canManageContacts(user(role))).toBe(true);
    expect(scopeContactQuery(user(role))).toEqual({});
  });

  it("el gerente de área también gestiona y ve todos", () => {
    expect(canManageContacts(user("GERENTE_AREA", "a1"))).toBe(true);
    expect(scopeContactQuery(user("GERENTE_AREA", "a1"))).toEqual({});
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "PREVENTA",
    "INGENIERO",
    "COORDINADOR_SOPORTE",
  ])("%s crea contactos, no los gestiona y ve los de su área", (role) => {
    const member = user(role, "a1");
    expect(canCreateContacts(member)).toBe(true);
    expect(canManageContacts(member)).toBe(false);
    expect(canManageCustomers(member)).toBe(false);
    expect(scopeContactQuery(member)).toEqual({
      areas: { some: { areaId: { in: ["a1"] } } },
    });
  });

  it("sin área no ve contactos aunque pueda crearlos", () => {
    expect(canCreateContacts(user("ALMACEN"))).toBe(true);
    expect(scopeContactQuery(user("ALMACEN"))).toEqual({ id: { in: [] } });
  });

  it("una cuenta del portal no crea ni ve contactos", () => {
    const client: SessionUser = {
      ...user("CLIENTE"),
      customer: {
        customerId: "c",
        seesBags: false,
        requestsWork: false,
        comments: false,
      },
    };
    expect(canCreateContacts(client)).toBe(false);
    expect(scopeContactQuery(client)).toEqual({ id: { in: [] } });
  });
});
