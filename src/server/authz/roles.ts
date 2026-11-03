// src/server/authz/roles.ts
// Usuario autenticado con sus roles y consultas sobre ellos. Los permisos de varios roles se suman (AGENTS.md §1).
import type { RoleCode } from "@/generated/prisma/enums";

export type SessionRole = { code: RoleCode; areaId: string | null };

// Empresa de una cuenta del portal y lo que su configuración le permite (AGENTS.md §2.11).
export type CustomerPortalAccess = {
  customerId: string;
  seesBags: boolean;
  requestsWork: boolean;
  comments: boolean;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roles: readonly SessionRole[];
  // POR QUÉ: opcional para no cargarlo en cada usuario interno de las pruebas; null o ausente = personal de DIMA.
  customer?: CustomerPortalAccess | null;
};

export function hasRole(user: SessionUser, code: RoleCode): boolean {
  return user.roles.some((role) => role.code === code);
}

// La sesión de una cuenta de cliente trae solo el rol CLIENTE (session.ts, §2.11).
export function isCustomerAccount(user: SessionUser): boolean {
  return hasRole(user, "CLIENTE");
}

// REGLA: un usuario es miembro de las áreas de cualquiera de sus roles con área (grupos de Entra → rol + área).
export function memberAreaIds(user: SessionUser): string[] {
  return [
    ...new Set(
      user.roles.flatMap((role) => (role.areaId ? [role.areaId] : [])),
    ),
  ];
}

// POR QUÉ: un gerente de área puede serlo de varias áreas; el rol lleva el área como alcance.
export function areaIdsWithRole(user: SessionUser, code: RoleCode): string[] {
  return user.roles
    .filter((role) => role.code === code && role.areaId !== null)
    .map((role) => role.areaId as string);
}
