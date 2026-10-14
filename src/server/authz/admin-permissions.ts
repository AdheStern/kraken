// src/server/authz/admin-permissions.ts
// Permisos de administración (AGENTS.md §1 roles, §2.9, §5 Administración): quién gestiona cada catálogo.
import { hasRole, type SessionUser } from "./roles";

// REGLA: el administrador del sistema gestiona usuarios, parámetros y los catálogos de estructura (áreas,
// ciudades, calendario, tecnologías, unidades, tipos de servicio); no ve montos por ese rol (§2.9).
export function canManageSystem(user: SessionUser): boolean {
  return hasRole(user, "ADMIN_SISTEMA");
}

// REGLA: Administración gestiona clientes y proveedores (§1); los productos van con ellos.
export function canManageCommercialCatalogs(user: SessionUser): boolean {
  return hasRole(user, "ADMINISTRACION") || hasRole(user, "ADMIN_SISTEMA");
}

export function canOpenAdmin(user: SessionUser): boolean {
  return canManageSystem(user) || canManageCommercialCatalogs(user);
}
