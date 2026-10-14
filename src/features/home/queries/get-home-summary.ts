// src/features/home/queries/get-home-summary.ts
// Lo que espera al usuario en Inicio según sus roles: aprobaciones, bolsas en riesgo y CV en borrador, cada uno
// por la consulta con alcance de su módulo (regla 7); null cuando el rol no tiene ese módulo.
import { listHourBags } from "@/features/hours/queries/list-hour-bags";
import type { BagSummary } from "@/features/hours/types";
import { listCvs } from "@/features/sales-control/queries/list-cvs";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import type { PendingApprovalItem } from "@/features/sales-control/types";
import { canApproveCvs, canCreateCv } from "@/server/authz/cv-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import type { SessionUser } from "@/server/authz/roles";

export type HomeSummary = {
  firstName: string;
  approvals: PendingApprovalItem[] | null;
  bagsAtRisk: BagSummary[] | null;
  activeBags: number | null;
  drafts: number | null;
};

export async function getHomeSummary(user: SessionUser): Promise<HomeSummary> {
  const [approvals, bags, drafts] = await Promise.all([
    canApproveCvs(user) ? listPendingApprovals(user) : null,
    canSeeHourBags(user) ? listHourBags(user) : null,
    canCreateCv(user) ? listCvs(user, { status: "BORRADOR" }) : null,
  ]);
  return {
    firstName: user.name.split(/\s+/)[0] ?? user.name,
    approvals,
    bagsAtRisk: bags?.filter((b) => b.riskGroup === "EN_RIESGO") ?? null,
    activeBags: bags ? bags.filter((b) => b.status === "ACTIVA").length : null,
    drafts: drafts?.length ?? null,
  };
}
