// src/features/admin/admin-access.ts
// Traduce el nivel de acceso de una sección (sistema o comercial) al permiso del usuario (§2.9).
import {
  canManageCommercialCatalogs,
  canManageSystem,
} from "@/server/authz/admin-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { AdminAccess } from "./admin-sections";

export function canManageAdminAccess(
  user: SessionUser,
  access: AdminAccess,
): boolean {
  return access === "system"
    ? canManageSystem(user)
    : canManageCommercialCatalogs(user);
}
