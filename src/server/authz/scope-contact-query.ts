// src/server/authz/scope-contact-query.ts
// Filtro de visibilidad de los puestos de contacto de clientes (decisión 2026-11-06).
// REGLA: todo listado de contactos pasa por aquí (regla 7); hoy quien puede verlos los ve todos.
import type { Prisma } from "@/generated/prisma/client";
import { canBrowseContacts } from "./contact-permissions";
import type { SessionUser } from "./roles";

const NOTHING: Prisma.CustomerContactWhereInput = { id: { in: [] } };

export function scopeContactQuery(
  user: SessionUser,
): Prisma.CustomerContactWhereInput {
  return canBrowseContacts(user) ? {} : NOTHING;
}
