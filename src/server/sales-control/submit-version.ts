// src/server/sales-control/submit-version.ts
// Envía una versión en BORRADOR a aprobación: congela el umbral, crea una solicitud por área (+GG si
// corresponde) y avisa a los aprobadores, todo en la transacción recibida (AGENTS.md §2.3, flujo de aprobación).
import Decimal from "decimal.js";
import { computeApprovalTargets } from "@/domain/sales-control/approval-round";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import { findApprovers, lockVersion } from "./approvers";
import { loadCvAccess } from "./cv-access";

type Options = { thresholdUsd: string; now: Date };

export async function submitVersion(
  tx: Tx,
  user: SessionUser,
  versionId: string,
  { thresholdUsd, now }: Options,
): Promise<ActionResult<{ requests: number }>> {
  await lockVersion(tx, versionId);
  const version = await tx.cvVersion.findUnique({
    where: { id: versionId },
    include: {
      cv: { select: { id: true, code: true } },
      lines: { where: { kind: "ITEM" }, select: { areaId: true } },
    },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (version.status !== "BORRADOR")
    return actionError("INVALID_STATE", "Esta versión ya fue enviada.");
  const access = await loadCvAccess(version.cv.id, versionId, tx);
  if (!access || !canEditCvDraft(user, access))
    return actionError(
      "FORBIDDEN",
      "Solo el comercial del CV o el GG pueden enviarlo.",
    );
  if (version.lines.length === 0)
    return actionError(
      "VALIDATION",
      "Agrega al menos una línea antes de enviar.",
    );

  const areaIds = version.lines.flatMap((line) =>
    line.areaId ? [line.areaId] : [],
  );
  const targets = computeApprovalTargets(
    areaIds,
    new Decimal(version.totalSaleUsd.toString()),
    new Decimal(thresholdUsd),
  );
  const approvers = await findApprovers(tx, targets);
  const missing = approvers.filter((a) => a.userIds.length === 0);
  if (missing.length > 0) {
    const names = await describeTargets(
      tx,
      missing.map((m) => m.target),
    );
    return actionError(
      "VALIDATION",
      `${names} no tiene gerente asignado. Pide al administrador del sistema que lo configure.`,
    );
  }

  // REGLA: el umbral se congela en la versión al enviarla y se evalúa por versión (§2.3, APROB-01).
  await tx.cvVersion.update({
    where: { id: versionId },
    data: {
      status: "EN_APROBACION",
      submittedAt: now,
      approvalThresholdUsd: thresholdUsd,
    },
  });
  await tx.cvApprovalRequest.createMany({
    data: targets.map((t) => ({
      versionId,
      kind: t.kind,
      areaId: t.kind === "AREA" ? t.areaId : null,
    })),
  });
  const label = toCvVersionLabel(version.cv.code, version.number);
  await notify(tx, {
    event: "CV_ENVIADO",
    userIds: approvers.flatMap((a) => a.userIds).filter((id) => id !== user.id),
    title: `${label} espera tu aprobación`,
    body: `${version.title} · enviado por ${user.name}.`,
    link: "/aprobaciones",
  });
  return actionOk({ requests: targets.length });
}

async function describeTargets(
  tx: Tx,
  targets: ReturnType<typeof computeApprovalTargets>,
): Promise<string> {
  const areaIds = targets.flatMap((t) => (t.kind === "AREA" ? [t.areaId] : []));
  const areas = await tx.area.findMany({
    where: { id: { in: areaIds } },
    select: { code: true },
  });
  const labels = [
    ...areas.map((a) => `El área ${a.code}`),
    ...(targets.some((t) => t.kind === "GERENCIA_GENERAL")
      ? ["La gerencia general"]
      : []),
  ];
  return labels.join(", ");
}
