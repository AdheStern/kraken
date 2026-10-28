// src/features/home/queries/get-home-summary.ts
// Lo que espera al usuario en Inicio según sus roles: aprobaciones, bolsas en riesgo, CV en borrador y, para el
// ingeniero, sus tickets y contadores abiertos; para inventario, traspasos en camino y ajustes por decidir; cada uno por la consulta con alcance de su módulo (regla 7);
// null cuando el rol no tiene ese módulo.

import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import type { BagSummary } from "@/features/hours/types";
import { countPendingAdjustments } from "@/features/inventory/queries/count-pending-adjustments";
import { countTransfersInTransit } from "@/features/inventory/queries/count-transfers-in-transit";
import { listCvs } from "@/features/sales-control/queries/list-cvs";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import type { PendingApprovalItem } from "@/features/sales-control/types";
import { listOpenTimers } from "@/features/tickets/queries/list-open-timers";
import { listTickets } from "@/features/tickets/queries/list-tickets";
import type { TimerView } from "@/features/tickets/types";
import { canApproveCvs, canCreateCv } from "@/server/authz/cv-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import {
  canDecideAdjustments,
  canOperateInventory,
} from "@/server/authz/inventory-permissions";
import { hasRole, type SessionUser } from "@/server/authz/roles";

export type HomeSummary = {
  firstName: string;
  approvals: PendingApprovalItem[] | null;
  bagsAtRisk: BagSummary[] | null;
  activeBags: number | null;
  drafts: number | null;
  myTickets: number | null;
  timers: TimerView[] | null;
  transfersInTransit: number | null;
  adjustmentsToDecide: number | null;
};

const FINISHED = ["CERRADO", "CANCELADO"];

export async function getHomeSummary(user: SessionUser): Promise<HomeSummary> {
  const isEngineer = hasRole(user, "INGENIERO");
  const [approvals, bags, drafts, tickets, timers, transfers, adjustments] =
    await Promise.all([
      canApproveCvs(user) ? listPendingApprovals(user) : null,
      canSeeHourBags(user) ? listHourBags(user) : null,
      canCreateCv(user) ? listCvs(user, { status: "BORRADOR" }) : null,
      isEngineer ? listTickets(user, { mine: true }) : null,
      isEngineer ? listOpenTimers({ userId: user.id }) : null,
      canOperateInventory(user) ? countTransfersInTransit(user) : null,
      canDecideAdjustments(user) ? countPendingAdjustments(user) : null,
    ]);
  return {
    firstName: user.name.split(/\s+/)[0] ?? user.name,
    approvals,
    bagsAtRisk: bags?.filter((b) => b.riskGroup === "EN_RIESGO") ?? null,
    activeBags: bags ? bags.filter((b) => b.status === "ACTIVA").length : null,
    drafts: drafts?.length ?? null,
    myTickets:
      tickets?.filter((t) => !FINISHED.includes(t.status)).length ?? null,
    timers,
    transfersInTransit: transfers,
    adjustmentsToDecide: adjustments,
  };
}
