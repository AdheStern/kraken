// src/features/help/manual-registry.ts
// Registro de los manuales por rol y elección del que se muestra (AGENTS.md §12 F6, §9 patrón Registry).
// POR QUÉ: los manuales son públicos para cualquier usuario con sesión; no traen datos, solo cómo se usa la app.
import type { RoleCode } from "@/generated/prisma/enums";
import { ADMINISTRATION_MANUAL } from "./manuals/administration";
import { AREA_MANAGER_MANUAL } from "./manuals/area-manager";
import { ENGINEER_MANUAL } from "./manuals/engineer";
import { GENERAL_MANAGER_MANUAL } from "./manuals/general-manager";
import { PRESALES_MANUAL } from "./manuals/presales";
import { SALES_MANUAL } from "./manuals/sales";
import { SUPPORT_COORDINATOR_MANUAL } from "./manuals/support-coordinator";
import { SYSTEM_ADMIN_MANUAL } from "./manuals/system-admin";
import { TICKET_REQUEST_SECTION } from "./manuals/ticket-request-section";
import { WAREHOUSE_MANUAL } from "./manuals/warehouse";
import type { Manual } from "./types";

// REGLA: un manual por rol; un rol nuevo en el enum no compila hasta tener el suyo.
export const MANUALS: Record<RoleCode, Manual> = {
  GERENTE_GENERAL: withRequests(GENERAL_MANAGER_MANUAL),
  GERENTE_AREA: withRequests(AREA_MANAGER_MANUAL),
  COMERCIAL: withRequests(SALES_MANUAL),
  PREVENTA: withRequests(PRESALES_MANUAL),
  INGENIERO: withRequests(ENGINEER_MANUAL),
  COORDINADOR_SOPORTE: withRequests(SUPPORT_COORDINATOR_MANUAL),
  ALMACEN: withRequests(WAREHOUSE_MANUAL),
  ADMINISTRACION: withRequests(ADMINISTRATION_MANUAL),
  ADMIN_SISTEMA: withRequests(SYSTEM_ADMIN_MANUAL),
};

// REGLA: todo usuario con rol pide tickets (§2.6), así que cada manual cierra con cómo hacerlo.
function withRequests(manual: Manual): Manual {
  return { ...manual, sections: [...manual.sections, TICKET_REQUEST_SECTION] };
}

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
  const sorted = [
    ...ORDER.filter((role) => own.has(role)),
    ...ORDER.filter((role) => !own.has(role)),
  ];
  const role = sorted.find((r) => r === requested) ?? sorted[0];
  return {
    role,
    manual: MANUALS[role],
    tabs: sorted.map((r) => ({
      role: r,
      title: MANUALS[r].title,
      isOwn: own.has(r),
    })),
  };
}
