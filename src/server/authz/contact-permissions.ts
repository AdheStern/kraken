// src/server/authz/contact-permissions.ts
// Clientes y contactos (decisión 2026-11-06): los gestionan (crear y editar clientes y sucursales; editar, dar de
// baja, transferir y exportar contactos, y verlos todos) el GG, los gerentes de área, Desarrollo de Negocios,
// Administración y el administrador del sistema. El resto del personal crea contactos y ve los de sus áreas.
import { hasRole, type SessionUser } from "./roles";

const MANAGERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "DESARROLLO_NEGOCIOS",
  "ADMINISTRACION",
  "ADMIN_SISTEMA",
] as const;

export function canManageCustomers(user: SessionUser): boolean {
  if (user.customer) return false;
  return MANAGERS.some((code) => hasRole(user, code));
}

// Editar, dar de baja, transferir y exportar contactos; ver el directorio completo.
export function canManageContacts(user: SessionUser): boolean {
  return canManageCustomers(user);
}

// REGLA: cualquier persona de DIMA con un rol crea contactos; una cuenta del portal nunca (§2.11).
export function canCreateContacts(user: SessionUser): boolean {
  return !user.customer && user.roles.length > 0;
}

export function canBrowseContacts(user: SessionUser): boolean {
  return canCreateContacts(user);
}
