// src/server/authz/scope-contact-query.ts
// Filtro de visibilidad de los puestos de contacto de clientes (decisión 2026-11-06): quien los gestiona ve todos;
// el resto, los asociados a alguna de sus áreas. Un contacto sin área solo lo ven quienes gestionan.
// REGLA: todo listado de contactos pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { canBrowseContacts, canManageContacts } from "./contact-permissions";
import { memberAreaIds, type SessionUser } from "./roles";

const NOTHING: Prisma.CustomerContactWhereInput = { id: { in: [] } };

export function scopeContactQuery(
  user: SessionUser,
): Prisma.CustomerContactWhereInput {
  if (canManageContacts(user)) return {};
  const areaIds = memberAreaIds(user);
  if (!canBrowseContacts(user) || areaIds.length === 0) return NOTHING;
  return { areas: { some: { areaId: { in: areaIds } } } };
}
