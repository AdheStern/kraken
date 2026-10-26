// src/features/help/manual-registry.ts
// Registro de los manuales por rol y elección del que se muestra (AGENTS.md §12 F6, §9 patrón Registry).
// POR QUÉ: los manuales son públicos para cualquier usuario con sesión; no traen datos, solo cómo se usa la app.
import type { RoleCode } from "@/generated/prisma/enums";
import { AREA_MANAGER_MANUAL } from "./manuals/area-manager";
import { ENGINEER_MANUAL } from "./manuals/engineer";
import { GENERAL_MANAGER_MANUAL } from "./manuals/general-manager";
import { SALES_MANUAL } from "./manuals/sales";
import type { Manual } from "./types";

export const MANUALS: Partial<Record<RoleCode, Manual>> = {
  GERENTE_GENERAL: GENERAL_MANAGER_MANUAL,
  GERENTE_AREA: AREA_MANAGER_MANUAL,
  COMERCIAL: SALES_MANUAL,
  INGENIERO: ENGINEER_MANUAL,
};

const ORDER: readonly RoleCode[] = [
  "GERENTE_GENERAL",
  "GERENTE_AREA",
  "COMERCIAL",
  "PREVENTA",
  "INGENIERO",
  "COORDINADOR_SOPORTE",
  "ALMACEN",
  "ADMINISTRACION",
  "ADMIN_SISTEMA",
];

export type ManualChoice = {
  role: RoleCode;
  manual: Manual;
  tabs: { role: RoleCode; title: string; isOwn: boolean }[];
};

// Los roles del usuario van primero; sin `requested` válido se abre el manual de su primer rol.
export function chooseManual(
  userRoles: readonly RoleCode[],
  requested: string | undefined,
): ManualChoice {
  const own = new Set(userRoles);
  const available = ORDER.filter((role) => MANUALS[role]);
  const sorted = [
    ...available.filter((role) => own.has(role)),
    ...available.filter((role) => !own.has(role)),
  ];
  const role = sorted.find((r) => r === requested) ?? sorted[0];
  return {
    role,
    manual: MANUALS[role] as Manual,
    tabs: sorted.map((r) => ({
      role: r,
      title: (MANUALS[r] as Manual).title,
      isOwn: own.has(r),
    })),
  };
}
