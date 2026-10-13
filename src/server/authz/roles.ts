// src/server/authz/roles.ts
// Usuario autenticado con sus roles y consultas sobre ellos. Los permisos de varios roles se suman (AGENTS.md §1).
import type { RoleCode } from "@/generated/prisma/enums";

export type SessionRole = { code: RoleCode; areaId: string | null };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roles: readonly SessionRole[];
};

export function hasRole(user: SessionUser, code: RoleCode): boolean {
  return user.roles.some((role) => role.code === code);
}

// POR QUÉ: un gerente de área puede serlo de varias áreas; el rol lleva el área como alcance.
export function areaIdsWithRole(user: SessionUser, code: RoleCode): string[] {
  return user.roles
    .filter((role) => role.code === code && role.areaId !== null)
    .map((role) => role.areaId as string);
}
