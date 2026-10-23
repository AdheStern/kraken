// src/server/authz/dashboard-permissions.ts
// Permisos de los tableros (AGENTS.md §2.9, fila "Tableros", y §6): quién ve el económico, el operativo y el de
// inventario, y quién define las metas.
import { canSeeInventoryCosts } from "./inventory-permissions";
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

// REGLA: el económico muestra costos y márgenes; lo ven quienes los ven en los CV (§2.9 "CV: costos y margen").
const SALES_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COMERCIAL",
  "ADMINISTRACION",
] as const;

// POR QUÉ: el operativo no lleva montos; el ingeniero se ve solo a sí mismo (lo recortan los alcances).
const OPERATIONS_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COORDINADOR_SOPORTE",
  "INGENIERO",
] as const;

export function canSeeSalesDashboard(user: SessionUser): boolean {
  return SALES_VIEWERS.some((code) => hasRole(user, code));
}

export function canSeeOperationsDashboard(user: SessionUser): boolean {
  return OPERATIONS_VIEWERS.some((code) => hasRole(user, code));
}

// REGLA: el de inventario es valorizado; solo para quien ve costos de inventario (§2.8).
export function canSeeInventoryDashboard(user: SessionUser): boolean {
  return canSeeInventoryCosts(user);
}

// REGLA: el GG define todas las metas y la de la empresa; el gerente de área, las de sus áreas (decisión
// 2026-10-22).
export function canEditGoal(user: SessionUser, areaId: string | null): boolean {
  if (hasRole(user, "GERENTE_GENERAL")) return true;
  return (
    areaId !== null && areaIdsWithRole(user, "GERENTE_AREA").includes(areaId)
  );
}

export function canEditGoals(user: SessionUser): boolean {
  return (
    hasRole(user, "GERENTE_GENERAL") ||
    areaIdsWithRole(user, "GERENTE_AREA").length > 0
  );
}
