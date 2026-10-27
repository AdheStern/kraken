// tests/authz/documentation-permissions.test.ts
// Documentación (AGENTS.md §2.10, §2.9): pública para todo usuario con rol; quitar es de quien subió o del
// administrador del sistema; las fases las gestiona el administrador del sistema.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canDeleteDocument,
  canManageDocPhases,
  canUseDocumentation,
} from "@/server/authz/documentation-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";

const ALL_ROLES: RoleCode[] = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COMERCIAL",
  "PREVENTA",
  "INGENIERO",
  "COORDINADOR_SOPORTE",
  "ALMACEN",
  "ADMINISTRACION",
  "ADMIN_SISTEMA",
];

function user(...roles: RoleCode[]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map((code) => ({ code, areaId: null })),
  };
}

describe("§2.10 Documentación", () => {
  it.each(
    ALL_ROLES,
  )("%s ve todos los proyectos, sube documentos y escribe o edita lecciones", (role) => {
    expect(canUseDocumentation(user(role))).toBe(true);
    expect(scopeDocProjectQuery(user(role))).toEqual({});
  });

  it("sin roles no ve ningún proyecto", () => {
    expect(canUseDocumentation(user())).toBe(false);
    expect(scopeDocProjectQuery(user())).toEqual({ id: { in: [] } });
  });

  it("quita un documento quien lo subió", () => {
    expect(canDeleteDocument(user("INGENIERO"), { uploadedById: "yo" })).toBe(
      true,
    );
  });

  it.each(
    ALL_ROLES.filter((r) => r !== "ADMIN_SISTEMA"),
  )("%s no quita el documento de otro", (role) => {
    expect(canDeleteDocument(user(role), { uploadedById: "otro" })).toBe(false);
  });

  it("el administrador del sistema quita cualquier documento", () => {
    expect(
      canDeleteDocument(user("ADMIN_SISTEMA"), { uploadedById: "otro" }),
    ).toBe(true);
  });

  it.each(
    ALL_ROLES,
  )("solo el administrador del sistema gestiona las fases (%s)", (role) => {
    expect(canManageDocPhases(user(role))).toBe(role === "ADMIN_SISTEMA");
  });
});
