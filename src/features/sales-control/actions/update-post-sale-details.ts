// src/features/sales-control/actions/update-post-sale-details.ts
// Guarda los datos posventa de la versión APROBADA vigente (observaciones, PO#, activación y seriales de las
// líneas; notas, seriales y PO# del leasing) y los copia a la versión siguiente sin aprobar (AGENTS.md §2.3,
// decisión 2026-11-03).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canEditPostSaleDetails } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { applyPostSaleLeasing } from "@/server/sales-control/apply-post-sale-leasing";
import { applyPostSaleLines } from "@/server/sales-control/apply-post-sale-lines";
import { lockVersion } from "@/server/sales-control/approvers";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { getSessionUser } from "@/server/session";
import {
  type UpdatePostSaleDetailsInput,
  updatePostSaleDetailsSchema,
} from "../schemas/post-sale-schemas";

export async function updatePostSaleDetails(
  input: UpdatePostSaleDetailsInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = updatePostSaleDetailsSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { versionId, lines, leasing } = parsed.data;
  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    select: { cvId: true },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  const access = await loadCvAccess(version.cvId, versionId);
  if (!access || !canEditPostSaleDetails(user, access))
    return actionError("FORBIDDEN", "No puedes editar este CV.");

  try {
    return await runInTransaction(async (tx) => {
      await lockVersion(tx, versionId);
      const { status } = await tx.cvVersion.findUniqueOrThrow({
        where: { id: versionId },
        select: { status: true },
      });
      if (status !== "APROBADA")
        return actionError(
          "INVALID_STATE",
          "Los datos posventa se completan solo en la versión aprobada vigente.",
        );
      const lineResult = await applyPostSaleLines(
        tx,
        version.cvId,
        versionId,
        lines,
      );
      if (!lineResult.ok) return actionError("VALIDATION", lineResult.message);
      const leasingResult = await applyPostSaleLeasing(
        tx,
        version.cvId,
        versionId,
        leasing,
      );
      if (!leasingResult.ok)
        return actionError("VALIDATION", leasingResult.message);
      const changes = [...lineResult.changes, ...leasingResult.changes];
      if (changes.length === 0) return actionOk(null);
      // POR QUÉ: la revisión de la versión remonta el editor con lo guardado.
      await tx.cvVersion.update({
        where: { id: versionId },
        data: { updatedAt: new Date() },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.version",
        entityId: versionId,
        action: "DATOS_POSVENTA",
        before: changes.map((c) => c.before),
        after: changes.map((c) => c.after),
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "updatePostSaleDetails");
  }
}
