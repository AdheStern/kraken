// src/features/sales-control/queries/get-cv-editor.ts
// Datos del editor de un CV visible para el usuario: la versión pedida (o la más reciente), su historial,
// sus solicitudes de aprobación y lo que el usuario puede hacer con ella.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import {
  canDecideApproval,
  canEditCvDraft,
  canExportCvVersion,
  canSeeCvCosts,
} from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { approvalRequestLabel } from "../approval-request-label";
import type { CvApprovalItem, CvEditorData, CvVersionSummary } from "../types";
import { toEditorHeader } from "./editor-header";

export async function getCvEditor(
  user: SessionUser,
  cvId: string,
  versionNumber?: number,
): Promise<CvEditorData | null> {
  const cv = await prisma.cv.findFirst({
    where: { AND: [scopeCvQuery(user), { id: cvId }] },
    select: {
      id: true,
      code: true,
      isOpeningBalance: true,
      city: { select: { name: true } },
      customer: { select: { name: true } },
      versions: {
        orderBy: { number: "desc" },
        include: {
          createdBy: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  const latest = cv?.versions[0];
  const shown = cv?.versions.find((v) => v.number === versionNumber) ?? latest;
  if (!cv || !latest || !shown) return null;

  const version = await prisma.cvVersion.findUniqueOrThrow({
    where: { id: shown.id },
    include: {
      sellers: { select: { userId: true } },
      approvalRequests: {
        orderBy: [{ kind: "asc" }, { area: { code: "asc" } }],
        include: {
          area: { select: { code: true } },
          decidedBy: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  const [latestAccess, shownAccess] = await Promise.all([
    loadCvAccess(cv.id, latest.id),
    loadCvAccess(cv.id, shown.id),
  ]);
  if (!latestAccess || !shownAccess) return null;
  const canManage = canEditCvDraft(user, latestAccess);
  const isLatest = shown.id === latest.id;

  const versions: CvVersionSummary[] = cv.versions.map((v) => ({
    id: v.id,
    number: v.number,
    label: toCvVersionLabel(cv.code, v.number),
    status: v.status,
    reason: v.reason,
    createdByName: v.createdBy.user.name,
    createdAt: v.createdAt.toISOString(),
    submittedAt: v.submittedAt?.toISOString() ?? null,
    approvedAt: v.approvedAt?.toISOString() ?? null,
  }));
  const approvals: CvApprovalItem[] = version.approvalRequests.map((r) => ({
    id: r.id,
    label: approvalRequestLabel(r.kind, r.area?.code ?? null),
    status: r.status,
    comment: r.comment,
    decidedByName: r.decidedBy?.user.name ?? null,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    canDecide:
      r.status === "PENDIENTE" &&
      version.status === "EN_APROBACION" &&
      canDecideApproval(user, r),
  }));

  return {
    header: toEditorHeader(cv, version),
    canEdit: isLatest && version.status === "BORRADOR" && canManage,
    canSeeCosts: canSeeCvCosts(user, shownAccess),
    canExport: canExportCvVersion(user, shownAccess, version.status),
    versionNumber: version.number,
    isLatest,
    latestStatus: latest.status,
    canManage,
    versions,
    approvals,
  };
}
