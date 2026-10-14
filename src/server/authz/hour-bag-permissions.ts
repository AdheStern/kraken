// src/server/authz/hour-bag-permissions.ts
// Permisos sobre bolsas de horas (AGENTS.md §2.9): entrar al módulo y ajustar o cerrar una bolsa.
import {
  areaIdsWithRole,
  hasRole,
  memberAreaIds,
  type SessionUser,
} from "./roles";

const BAG_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COMERCIAL",
  "INGENIERO",
  "ADMINISTRACION",
  "COORDINADOR_SOPORTE",
] as const;

export function canSeeHourBags(user: SessionUser): boolean {
  return (
    BAG_VIEWERS.some((code) => hasRole(user, code)) ||
    memberAreaIds(user).length > 0
  );
}

// REGLA: ajuste manual (y cierre): el gerente de área en las bolsas de su área y el GG en todas,
// siempre con motivo; nadie más (§2.9, fila "Bolsas: ajuste manual").
export function canAdjustHourBag(
  user: SessionUser,
  bag: { areaIds: readonly string[] },
): boolean {
  if (hasRole(user, "GERENTE_GENERAL")) return true;
  const managed = areaIdsWithRole(user, "GERENTE_AREA");
  return bag.areaIds.some((areaId) => managed.includes(areaId));
}
