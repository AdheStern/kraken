// src/server/authz/scope-cv-query.ts
// Filtro de visibilidad de CV según los roles del usuario (AGENTS.md §2.9, fila "CV: ver").
// REGLA: todo listado de CV pasa por aquí; prohibido escribir condiciones de visibilidad a mano (regla 7).
import type { Prisma } from "@/generated/prisma/client";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const NOTHING: Prisma.CvWhereInput = { id: { in: [] } };

// POR QUÉ: el ingeniero no entra por aquí; ve la cabecera y las horas de los CV de sus tickets con
// scopeCvHoursQuery, sin editor ni montos (§2.9, regla 12).
export function scopeCvQuery(user: SessionUser): Prisma.CvWhereInput {
  if (hasRole(user, "GERENTE_GENERAL")) return {};

  const visible: Prisma.CvWhereInput[] = [];
  if (hasRole(user, "COMERCIAL") || hasRole(user, "GERENTE_AREA")) {
    visible.push(
      { createdById: user.id },
      { versions: { some: { sellers: { some: { userId: user.id } } } } },
    );
  }
  if (hasRole(user, "PREVENTA")) {
    visible.push({ versions: { some: { presalesId: user.id } } });
  }
  const managedAreaIds = areaIdsWithRole(user, "GERENTE_AREA");
  if (managedAreaIds.length > 0) {
    visible.push({
      versions: {
        some: { lines: { some: { areaId: { in: managedAreaIds } } } },
      },
    });
  }
  if (hasRole(user, "ADMINISTRACION")) {
    visible.push({ versions: { some: { status: "APROBADA" } } });
  }
  return visible.length > 0 ? { OR: visible } : NOTHING;
}
