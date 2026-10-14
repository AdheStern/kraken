// src/features/admin/role-area-rules.ts
// Qué roles llevan área: el gerente de área la exige; los roles operativos pueden tenerla (los hace miembros
// del área, §2.9 bolsas); los roles de toda la empresa no la llevan.
// [CONFIRMAR] con DIMA qué roles operativos se acotan por área (AGENTS.md §0.16: regla aislada).
import type { RoleCode } from "@/generated/prisma/enums";

export type RoleAreaRule = "REQUIRED" | "OPTIONAL" | "NONE";

export const ROLE_AREA_RULES: Record<RoleCode, RoleAreaRule> = {
  GERENTE_AREA: "REQUIRED",
  COMERCIAL: "OPTIONAL",
  PREVENTA: "OPTIONAL",
  INGENIERO: "OPTIONAL",
  COORDINADOR_SOPORTE: "OPTIONAL",
  GERENTE_GENERAL: "NONE",
  ADMINISTRACION: "NONE",
  ALMACEN: "NONE",
  ADMIN_SISTEMA: "NONE",
};

export function roleAreaIssue(
  role: RoleCode,
  areaId: string | null,
): string | null {
  const rule = ROLE_AREA_RULES[role];
  if (rule === "REQUIRED" && !areaId)
    return "El gerente de área necesita el área que aprueba.";
  if (rule === "NONE" && areaId)
    return "Este rol rige en toda la empresa; no lleva área.";
  return null;
}
