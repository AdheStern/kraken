// src/features/sales-control/queries/get-cv-editor.ts
// Datos del editor de un CV visible para el usuario: la versión pedida (o la más reciente), su historial,
// sus solicitudes de aprobación y lo que el usuario puede hacer con ella.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import {
  canDecideApproval,
  canEditCvActivation,
  canEditCvDraft,
  canEditCvHeaderAnyState,
  canEditCvWithholdings,
  canEditPostSaleDetails,
  canExportCvVersion,
  canSeeCvCosts,
  canSetCvFinalPrice,
} from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import { getDecimalParameter } from "@/server/parameters";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { approvalRequestLabel } from "../approval-request-label";
import type {
  CvApprovalItem,
  CvEditorData,
  CvFinalPriceView,
  CvVersionSummary,
} from "../types";
import { toEditorHeader } from "./editor-header";

const FINAL_PRICE_DEVIATION_FALLBACK_PCT = "5";

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
      customerId: true,
      customer: { select: { name: true, taxId: true, address: true } },
      versions: {
        orderBy: { number: "desc" },
        include: {
          createdBy: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  const latest = cv?.versions[0];
  if (!cv || !latest) return null;
  const latestAccess = await loadCvAccess(cv.id, latest.id);
  if (!latestAccess) return null;
  const shown =
    cv.versions.find((v) => v.number === versionNumber) ?? cv.versions[0];
  if (!shown) return null;

  const version = await prisma.cvVersion.findUniqueOrThrow({
    where: { id: shown.id },
    include: {
      sellers: { select: { userId: true } },
      finalPriceBy: { select: { user: { select: { name: true } } } },
      approvalRequests: {
        orderBy: [{ kind: "asc" }, { area: { code: "asc" } }],
        include: {
          area: { select: { code: true } },
          decidedBy: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });
  const shownAccess = await loadCvAccess(cv.id, shown.id);
  if (!shownAccess) return null;
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
    finalPrice: {
      value: toFinalPriceView(version),
      canSet: version.status !== "ANULADA" && canSetCvFinalPrice(user),
      maxDeviationPct: await getDecimalParameter(
        "cv.precio_final_desvio_max_pct",
        FINAL_PRICE_DEVIATION_FALLBACK_PCT,
      ),
    },
    canEdit: isLatest && version.status === "BORRADOR" && canManage,
    canEditHeader:
      (isLatest && version.status === "BORRADOR" && canManage) ||
      canEditCvHeaderAnyState(user, shownAccess),
    fxLocked: !(isLatest && version.status === "BORRADOR" && canManage),
    canEditPostSale:
      version.status === "APROBADA" &&
      canEditPostSaleDetails(user, latestAccess),
    canEditWithholdings: canEditCvWithholdings(user, shownAccess),
    canEditActivation:
      version.status !== "ANULADA" &&
      (canEditCvActivation(user, shownAccess) ||
        canEditPostSaleDetails(user, latestAccess)),
    canSeeCosts: canSeeCvCosts(user, shownAccess),
    canExport: canExportCvVersion(user, shownAccess),
    versionNumber: version.number,
    isLatest,
    latestStatus: latest.status,
    canManage,
    versions,
    approvals,
  };
}

type FinalPriceRow = {
  finalSaleUsd: { toFixed(dp: number): string } | null;
  finalSaleBs: { toFixed(dp: number): string } | null;
  finalBaseSaleUsd: { toFixed(dp: number): string } | null;
  finalPriceReason: string | null;
  finalPriceAt: Date | null;
  finalPriceBy: { user: { name: string } } | null;
};

function toFinalPriceView(version: FinalPriceRow): CvFinalPriceView | null {
  if (!version.finalSaleUsd && !version.finalSaleBs) return null;
  return {
    saleUsd: version.finalSaleUsd?.toFixed(2) ?? null,
    saleBs: version.finalSaleBs?.toFixed(2) ?? null,
    baseSaleUsd: version.finalBaseSaleUsd?.toFixed(2) ?? "0.00",
    reason: version.finalPriceReason ?? "",
    byName: version.finalPriceBy?.user.name ?? "",
    at: version.finalPriceAt?.toISOString() ?? "",
  };
}
