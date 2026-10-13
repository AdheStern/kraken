// src/components/app-shell/role-nav.tsx
// Navegación según el rol: Bolsas de horas para quien las ve (§2.9) y Aprobaciones solo para quien aprueba,
// con el número de solicitudes pendientes.
// Va dentro de un <Suspense> porque lee la sesión.
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import { canApproveCvs } from "@/server/authz/cv-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import { requireUser } from "@/server/session";
import { AppNav } from "./app-nav";
import { BASE_NAV, type NavEntry } from "./nav-entries";

export async function RoleNav() {
  const user = await requireUser();
  const entries: NavEntry[] = [...BASE_NAV];
  if (canSeeHourBags(user)) entries.push({ key: "horas" });
  if (canApproveCvs(user)) {
    const pending = await listPendingApprovals(user);
    entries.push({ key: "aprobaciones", badge: pending.length });
  }
  return <AppNav entries={entries} />;
}
