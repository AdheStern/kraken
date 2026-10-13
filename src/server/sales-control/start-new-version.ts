// src/server/sales-control/start-new-version.ts
// Crea una versión nueva en BORRADOR a partir de la vigente (APROBADA u OBSERVADA), con motivo obligatorio.
// La aprobada sigue vigente hasta que se apruebe la nueva (AGENTS.md §2.3).

import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { canStartNewVersion } from "@/domain/sales-control/version-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { lockVersion } from "./approvers";
import { copyVersionContent } from "./copy-version-content";
import { loadCvAccess } from "./cv-access";

export async function startNewVersion(
  tx: Tx,
  user: SessionUser,
  { cvId, reason }: { cvId: string; reason: string },
): Promise<ActionResult<{ versionNumber: number }>> {
  if (reason.trim().length < 5)
    return actionError(
      "VALIDATION",
      "Explica el motivo del cambio (mínimo 5 caracteres).",
    );
  const latest = await tx.cvVersion.findFirst({
    where: { cvId },
    orderBy: { number: "desc" },
    include: { sellers: true, cv: { select: { code: true } } },
  });
  if (!latest) return actionError("NOT_FOUND", "El CV ya no existe.");
  await lockVersion(tx, latest.id);
  const access = await loadCvAccess(cvId, latest.id, tx);
  if (!access || !canEditCvDraft(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el comercial del CV o el GG pueden crear versiones.",
    );
  if (!canStartNewVersion(latest.status)) {
    return actionError(
      "INVALID_STATE",
      "Ya hay una versión en borrador o en aprobación; termínala primero.",
    );
  }

  const {
    id: _id,
    number,
    status: _s,
    reason: _r,
    submittedAt: _sub,
    approvedAt: _a,
    observedAt: _o,
    replacedAt: _rep,
    voidedAt: _v,
    approvalThresholdUsd: _t,
    createdAt: _c,
    updatedAt: _u,
    sellers,
    cv,
    customerSnapshot,
    ...header
  } = latest;
  const created = await tx.cvVersion.create({
    data: {
      ...header,
      customerSnapshot: customerSnapshot ?? {},
      number: number + 1,
      reason: reason.trim(),
      createdById: user.id,
      sellers: { create: sellers.map(({ userId }) => ({ userId })) },
    },
  });
  await copyVersionContent(tx, latest.id, created.id, { includeSerials: true });
  await notify(tx, {
    event: "CV_NUEVA_VERSION",
    userIds: sellers.map((s) => s.userId).filter((id) => id !== user.id),
    title: `${toCvVersionLabel(cv.code, created.number)} en borrador`,
    body: `${user.name} abrió una versión nueva: ${reason.trim()}`,
    link: `/cv/${cvId}`,
  });
  return actionOk({ versionNumber: created.number });
}
