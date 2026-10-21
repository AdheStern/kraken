// src/server/authz/inventory-permissions.ts
// Permisos de inventario (AGENTS.md §2.9, fila "Inventario"): consultar stock, ver costos, operar (ingresos,
// salidas, POS, traspasos, conteos) y decidir ajustes.
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

const STOCK_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COMERCIAL",
  "INGENIERO",
  "ALMACEN",
  "ADMINISTRACION",
] as const;

// REGLA: comercial e ingeniero consultan solo cantidades; el ingeniero nunca recibe costos (regla 12).
const COST_VIEWERS = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "ALMACEN",
  "ADMINISTRACION",
] as const;

const OPERATORS = ["GERENTE_GENERAL", "ALMACEN", "ADMINISTRACION"] as const;

export function canSeeInventory(user: SessionUser): boolean {
  return STOCK_VIEWERS.some((code) => hasRole(user, code));
}

export function canSeeInventoryCosts(user: SessionUser): boolean {
  return COST_VIEWERS.some((code) => hasRole(user, code));
}

export function canOperateInventory(user: SessionUser): boolean {
  return OPERATORS.some((code) => hasRole(user, code));
}

// REGLA: el ajuste lo aprueba el gerente del área de la solicitud o Administración (y el GG); sin área, solo
// Administración o el GG. Quien lo pidió no lo decide (§2.8, §2.9).
export function canDecideAdjustment(
  user: SessionUser,
  request: { areaId: string | null; requestedById: string },
): boolean {
  if (request.requestedById === user.id) return false;
  if (hasRole(user, "GERENTE_GENERAL") || hasRole(user, "ADMINISTRACION"))
    return true;
  return (
    request.areaId !== null &&
    areaIdsWithRole(user, "GERENTE_AREA").includes(request.areaId)
  );
}

export function canDecideAdjustments(user: SessionUser): boolean {
  return (
    hasRole(user, "GERENTE_GENERAL") ||
    hasRole(user, "ADMINISTRACION") ||
    areaIdsWithRole(user, "GERENTE_AREA").length > 0
  );
}
