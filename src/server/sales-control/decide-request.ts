// src/server/sales-control/decide-request.ts
// Registra la decisión de un aprobador y resuelve la ronda: todas aprueban → APROBADA (la anterior pasa a
// REEMPLAZADA); un rechazo → OBSERVADA y se cierran las pendientes (AGENTS.md §2.3, APROB-01).
import { decideInRound } from "@/domain/sales-control/approval-round";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canDecideApproval } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyVersionBags } from "@/server/hours/apply-version-bags";
import { applyVersionReservations } from "@/server/inventory/apply-version-reservations";
import { notify } from "@/server/notifications/notify";
import { lockVersion } from "./approvers";

type Decision = {
  requestId: string;
  decision: "APROBADA" | "RECHAZADA";
  comment: string;
};

export async function decideRequest(
  tx: Tx,
  user: SessionUser,
  { requestId, decision, comment }: Decision,
  now: Date,
): Promise<ActionResult<{ round: string }>> {
  const request = await tx.cvApprovalRequest.findUnique({
    where: { id: requestId },
    select: { versionId: true, kind: true, areaId: true },
  });
  if (!request) return actionError("NOT_FOUND", "La solicitud ya no existe.");
  if (!canDecideApproval(user, request))
    return actionError(
      "FORBIDDEN",
      "Esta solicitud la decide el gerente de su área.",
    );
  if (decision === "RECHAZADA" && comment.trim() === "")
    return actionError("VALIDATION", "Escribe el motivo del rechazo.");

  await lockVersion(tx, request.versionId);
  const version = await tx.cvVersion.findUniqueOrThrow({
    where: { id: request.versionId },
    include: {
      cv: { select: { id: true, code: true, createdById: true } },
      sellers: true,
      approvalRequests: true,
    },
  });
  if (version.status !== "EN_APROBACION")
    return actionError(
      "INVALID_STATE",
      "Esta versión ya no está en aprobación.",
    );
  const outcome = decideInRound(version.approvalRequests, {
    requestId,
    status: decision,
  });
  if (!outcome)
    return actionError("CONFLICT", "Esta solicitud ya fue decidida.");

  for (const update of outcome.updates) {
    const isMine = update.id === requestId;
    await tx.cvApprovalRequest.update({
      where: { id: update.id },
      data: isMine
        ? {
            status: update.status,
            comment: comment.trim() || null,
            decidedById: user.id,
            decidedAt: now,
          }
        : { status: update.status },
    });
  }
  if (outcome.round === "APROBADA") {
    // REGLA: la versión aprobada anterior pasa a REEMPLAZADA antes, por el índice de una sola APROBADA (§2.3).
    await tx.cvVersion.updateMany({
      where: { cvId: version.cvId, status: "APROBADA" },
      data: { status: "REEMPLAZADA", replacedAt: now },
    });
    await tx.cvVersion.update({
      where: { id: version.id },
      data: { status: "APROBADA", approvedAt: now },
    });
    // REGLA: al aprobarse se generan las bolsas de horas y las reservas de stock (§2.3, §2.4, §2.8); si el plan de
    // bolsas es inviable, applyVersionBags lanza y la decisión entera se revierte. Las reservas nunca lanzan.
    const versionLabel = toCvVersionLabel(version.cv.code, version.number);
    await applyVersionBags(tx, {
      cvId: version.cvId,
      versionId: version.id,
      actorId: user.id,
      label: versionLabel,
      reason: version.reason,
    });
    await applyVersionReservations(tx, {
      cvId: version.cvId,
      versionId: version.id,
      actorId: user.id,
      label: versionLabel,
    });
  } else if (outcome.round === "OBSERVADA") {
    await tx.cvVersion.update({
      where: { id: version.id },
      data: { status: "OBSERVADA", observedAt: now },
    });
  }

  const label = toCvVersionLabel(version.cv.code, version.number);
  const sellers = [
    version.cv.createdById,
    ...version.sellers.map((s) => s.userId),
  ];
  const event =
    outcome.round === "APROBADA"
      ? "CV_APROBADO"
      : outcome.round === "OBSERVADA"
        ? "CV_OBSERVADO"
        : "CV_SOLICITUD_DECIDIDA";
  const verb = decision === "APROBADA" ? "aprobó" : "rechazó";
  const roundText =
    outcome.round === "APROBADA"
      ? " Todas las áreas aprobaron."
      : outcome.round === "OBSERVADA"
        ? " Corrige en una versión nueva."
        : "";
  await notify(tx, {
    event,
    userIds: sellers.filter((id) => id !== user.id),
    title: `${label}: ${user.name} ${verb}`,
    body:
      `${comment.trim() ? `«${comment.trim()}». ` : ""}${roundText}`.trim() ||
      version.title,
    link: `/cv/${version.cv.id}`,
  });
  return actionOk({ round: outcome.round });
}
