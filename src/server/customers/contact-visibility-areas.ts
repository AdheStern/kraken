// src/server/customers/contact-visibility-areas.ts
// Áreas con que queda un puesto que crea quien no gestiona contactos: las elegidas más las suyas, para que siga
// viendo lo que acaba de crear (decisión 2026-11-06). Quien gestiona ve todo y deja las elegidas.
import { canManageContacts } from "@/server/authz/contact-permissions";
import { memberAreaIds, type SessionUser } from "@/server/authz/roles";

export function withOwnAreas(
  user: SessionUser,
  areaIds: readonly string[] = [],
): string[] {
  if (canManageContacts(user)) return [...areaIds];
  return [...new Set([...areaIds, ...memberAreaIds(user)])];
}
