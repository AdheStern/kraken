// tests/authz/admin-permissions.test.ts
// Administración (AGENTS.md §1 roles, §2.9): quién gestiona el catálogo comercial y quién la estructura,
// los usuarios y los parámetros.
import { describe, expect, it } from "vitest";
import { canManageAdminAccess } from "@/features/admin/admin-access";
import type { RoleCode } from "@/generated/prisma/enums";
import { canOpenAdmin } from "@/server/authz/admin-permissions";
import type { SessionUser } from "@/server/authz/roles";

function user(...roles: RoleCode[]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map((code) => ({ code, areaId: null })),
  };
}

describe("§2.9 Administración", () => {
  it("el administrador del sistema gestiona todo", () => {
    const admin = user("ADMIN_SISTEMA");
    expect(canManageAdminAccess(admin, "system")).toBe(true);
    expect(canManageAdminAccess(admin, "commercial")).toBe(true);
  });

  it("Administración gestiona clientes, proveedores y productos, no la estructura", () => {
    const office = user("ADMINISTRACION");
    expect(canManageAdminAccess(office, "commercial")).toBe(true);
    expect(canManageAdminAccess(office, "system")).toBe(false);
    expect(canOpenAdmin(office)).toBe(true);
  });

  it.each<RoleCode>([
    "GERENTE_GENERAL",
    "GERENTE_AREA",
    "COMERCIAL",
    "PREVENTA",
    "INGENIERO",
    "COORDINADOR_SOPORTE",
    "ALMACEN",
  ])("%s no entra a la administración", (role) => {
    expect(canOpenAdmin(user(role))).toBe(false);
  });
});
