// src/server/authz/scope-sales-line-query.ts
// Filtro de visibilidad de líneas de CV para los tableros económicos: el alcance va por línea, porque un CV
// puede tener líneas de varias áreas (AGENTS.md §2.9 "CV: costos y margen", §6).
// REGLA: toda lectura de ventas, pipeline o renovaciones pasa por aquí (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.CvLineWhereInput = { id: { in: [] } };

// REGLA: GG todo; gerente de área las líneas de sus áreas y sus propios CV; comercial las líneas de los CV donde
// es vendedor o creador; Administración solo lo aprobado; nadie más (§2.9).
export function scopeSalesLineQuery(
  user: SessionUser,
): Prisma.CvLineWhereInput {
  if (hasRole(user, "GERENTE_GENERAL")) return {};

  const visible: Prisma.CvLineWhereInput[] = [];
  if (hasRole(user, "COMERCIAL") || hasRole(user, "GERENTE_AREA")) {
    visible.push(
      { version: { cv: { createdById: user.id } } },
      { version: { sellers: { some: { userId: user.id } } } },
    );
  }
  const managedAreaIds = areaIdsWithRole(user, "GERENTE_AREA");
  if (managedAreaIds.length > 0) {
    visible.push({ areaId: { in: managedAreaIds } });
  }
  if (hasRole(user, "ADMINISTRACION")) {
    visible.push({
      version: { status: { in: ["APROBADA", "REEMPLAZADA"] } },
    });
  }
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
