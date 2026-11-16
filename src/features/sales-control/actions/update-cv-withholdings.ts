// src/features/sales-control/actions/update-cv-withholdings.ts
// Guarda GROSS UP y RET DIMA de las líneas de una versión en cualquier estado y los copia a la versión siguiente sin
// aprobar (AGENTS.md §2.3, decisión 2026-11-16).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canEditCvWithholdings } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { applyLineWithholdings } from "@/server/sales-control/apply-line-withholdings";
import { lockVersion } from "@/server/sales-control/approvers";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { getSessionUser } from "@/server/session";
import {
  type UpdateCvWithholdingsInput,
  updateCvWithholdingsSchema,
} from "../schemas/withholdings-schema";

export async function updateCvWithholdings(
  input: UpdateCvWithholdingsInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = updateCvWithholdingsSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { versionId, lines } = parsed.data;
  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    select: { cvId: true },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  const access = await loadCvAccess(version.cvId, versionId);
  if (!access || !canEditCvWithholdings(user, access))
    return actionError("FORBIDDEN", "No puedes editar GROSS UP ni RET DIMA.");

  try {
    return await runInTransaction(async (tx) => {
      await lockVersion(tx, versionId);
      const result = await applyLineWithholdings(
        tx,
        version.cvId,
        versionId,
        lines,
      );
      if (!result.ok) return actionError("VALIDATION", result.message);
      if (result.changes.length === 0) return actionOk(null);
      // POR QUÉ: la revisión de la versión remonta el editor con lo guardado.
      await tx.cvVersion.update({
        where: { id: versionId },
        data: { updatedAt: new Date() },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.version",
        entityId: versionId,
        action: "GROSS_UP_RET_DIMA",
        before: result.changes.map((c) => c.before),
        after: result.changes.map((c) => c.after),
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "updateCvWithholdings");
  }
}
