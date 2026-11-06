// src/server/authz/contact-permissions.ts
// Quién ve el directorio de contactos de clientes (decisión 2026-11-06): lo gestionan Administración y el
// administrador del sistema; comerciales, preventa, gerentes de área y el GG lo buscan y exportan.
import { canManageCommercialCatalogs } from "./admin-permissions";
import { hasRole, type SessionUser } from "./roles";

const BROWSERS = [
  "COMERCIAL",
  "PREVENTA",
  "GERENTE_AREA",
  "GERENTE_GENERAL",
] as const;

export function canBrowseContacts(user: SessionUser): boolean {
  if (user.customer) return false;
  return (
    canManageCommercialCatalogs(user) ||
    BROWSERS.some((code) => hasRole(user, code))
  );
}
