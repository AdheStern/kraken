// src/server/sales-control/void-version.ts
// Anula la versión vigente de un CV (BORRADOR o APROBADA, §8). Si no queda ninguna aprobada, el CV queda
// anulado; si se descarta un borrador sobre una aprobada, la aprobada sigue vigente. El número no se reutiliza.

import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { nextVersionState } from "@/domain/sales-control/version-state-machine";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { lockVersion } from "./approvers";
import { loadCvAccess } from "./cv-access";

export async function voidLatestVersion(
  tx: Tx,
  user: SessionUser,
  { cvId, reason }: { cvId: string; reason: string },
  now: Date,
): Promise<ActionResult<{ cvVoided: boolean }>> {
  if (reason.trim().length < 5)
    return actionError(
      "VALIDATION",
      "Explica el motivo de la anulación (mínimo 5 caracteres).",
    );
  const latest = await tx.cvVersion.findFirst({
    where: { cvId },
    orderBy: { number: "desc" },
    include: { sellers: true, cv: true },
  });
  if (!latest) return actionError("NOT_FOUND", "El CV ya no existe.");
  await lockVersion(tx, latest.id);
  const access = await loadCvAccess(cvId, latest.id, tx);
  if (!access || !canEditCvDraft(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el comercial del CV o el GG pueden anularlo.",
    );
  if (!nextVersionState(latest.status, "ANULAR")) {
    return actionError(
      "INVALID_STATE",
      "Solo se anula un borrador o una versión aprobada.",
    );
  }
  if (
    latest.status === "APROBADA" &&
    (await hasDownstreamActivity(tx, latest.id))
  ) {
    return actionError(
      "INVALID_STATE",
      "La versión tiene consumos de horas o despachos; no se puede anular.",
    );
  }

  await tx.cvVersion.update({
    where: { id: latest.id },
    data: { status: "ANULADA", voidedAt: now },
  });
  const stillApproved = await tx.cvVersion.count({
    where: { cvId, status: "APROBADA" },
  });
  if (stillApproved === 0) {
    await tx.cv.update({
      where: { id: cvId },
      data: { voidedAt: now, voidReason: reason.trim() },
    });
  }
  await notify(tx, {
    event: "CV_ANULADO",
    userIds: latest.sellers.map((s) => s.userId).filter((id) => id !== user.id),
    title: `${toCvVersionLabel(latest.cv.code, latest.number)} anulado`,
    body: `${user.name}: ${reason.trim()}`,
    link: `/cv/${cvId}`,
  });
  return actionOk({ cvVoided: stillApproved === 0 });
}

// REGLA: una versión aprobada con consumos de horas o despachos de inventario no se anula (§8).
async function hasDownstreamActivity(
  tx: Tx,
  versionId: string,
): Promise<boolean> {
  const [consumptions, movements] = await Promise.all([
    tx.hourMovement.count({
      where: { kind: "CONSUMO", bag: { cvLine: { versionId } } },
    }),
    tx.invMovement.count({ where: { cvLine: { versionId } } }),
  ]);
  return consumptions + movements > 0;
}
