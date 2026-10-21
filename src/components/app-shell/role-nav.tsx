// src/components/app-shell/role-nav.tsx
// Navegación según el rol: Tickets, Bolsas de horas e Inventario para quien los ve (§2.9) y Aprobaciones solo para quien aprueba,
// con el número de solicitudes pendientes.
// Va dentro de un <Suspense> porque lee la sesión.
import { countPendingAdjustments } from "@/features/inventory/queries/count-pending-adjustments";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import { canOpenAdmin } from "@/server/authz/admin-permissions";
import { canApproveCvs } from "@/server/authz/cv-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import { canSeeInventory } from "@/server/authz/inventory-permissions";
import { canSeeTickets } from "@/server/authz/ticket-permissions";
import { requireUser } from "@/server/session";
import { AppNav } from "./app-nav";
import { BASE_NAV, type NavEntry } from "./nav-entries";

export async function RoleNav() {
  const user = await requireUser();
  const entries: NavEntry[] = [...BASE_NAV];
  if (canSeeTickets(user)) entries.push({ key: "tickets" });
  if (canSeeHourBags(user)) entries.push({ key: "horas" });
  if (canSeeInventory(user))
    entries.push({
      key: "inventario",
      badge: await countPendingAdjustments(user),
    });
  if (canApproveCvs(user)) {
    const pending = await listPendingApprovals(user);
    entries.push({ key: "aprobaciones", badge: pending.length });
  }
  if (canOpenAdmin(user)) entries.push({ key: "admin" });
  return <AppNav entries={entries} />;
}
