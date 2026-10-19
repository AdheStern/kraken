// src/components/app-shell/role-nav.tsx
// Navegación según el rol: Tickets y Bolsas de horas para quien los ve (§2.9) y Aprobaciones solo para quien aprueba,
// con el número de solicitudes pendientes.
// Va dentro de un <Suspense> porque lee la sesión.
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import { canOpenAdmin } from "@/server/authz/admin-permissions";
import { canApproveCvs } from "@/server/authz/cv-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import { canSeeTickets } from "@/server/authz/ticket-permissions";
import { requireUser } from "@/server/session";
import { AppNav } from "./app-nav";
import { BASE_NAV, type NavEntry } from "./nav-entries";

export async function RoleNav() {
  const user = await requireUser();
  const entries: NavEntry[] = [...BASE_NAV];
  if (canSeeTickets(user)) entries.push({ key: "tickets" });
  if (canSeeHourBags(user)) entries.push({ key: "horas" });
  if (canApproveCvs(user)) {
    const pending = await listPendingApprovals(user);
    entries.push({ key: "aprobaciones", badge: pending.length });
  }
  if (canOpenAdmin(user)) entries.push({ key: "admin" });
  return <AppNav entries={entries} />;
}
