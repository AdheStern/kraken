// src/features/sales-control/actions/upsert-cv-leasing.ts
// Guarda la sección de leasing de una versión en BORRADOR. No toca los totales de venta (AGENTS.md §2.1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { getSessionUser } from "@/server/session";
import {
  type UpsertCvLeasingInput,
  upsertCvLeasingSchema,
} from "../schemas/cv-leasing-schema";

export async function upsertCvLeasing(
  input: UpsertCvLeasingInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = upsertCvLeasingSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row =
      typeof issue.path[1] === "number"
        ? `Leasing, línea ${issue.path[1] + 1}: `
        : "";
    return actionError("VALIDATION", `${row}${issue.message}`);
  }
  const { versionId, lines } = parsed.data;

  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    select: { cvId: true, status: true },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (version.status !== "BORRADOR")
    return actionError(
      "INVALID_STATE",
      "Solo se edita la versión en borrador.",
    );
  const access = await loadCvAccess(version.cvId, versionId);
  if (!access || !canEditCvDraft(user, access))
    return actionError("FORBIDDEN", "No puedes editar este CV.");

  try {
    await runInTransaction(async (tx) => {
      const kept = lines.flatMap((line) => (line.id ? [line.id] : []));
      await tx.cvLeasingLine.deleteMany({
        where: { versionId, id: { notIn: kept } },
      });
      for (const [index, line] of lines.entries()) {
        const data = {
          position: index + 1,
          supplierId: line.supplierId,
          technologyId: line.technologyId,
          code: line.code || null,
          description: line.description,
          quantity: line.quantity.trim(),
          unitCostUsd: line.unitCostUsd.trim(),
          notes: line.notes || null,
          poNumber: line.poNumber || null,
        };
        if (line.id)
          await tx.cvLeasingLine.update({
            where: { id: line.id, versionId },
            data,
          });
        else await tx.cvLeasingLine.create({ data: { ...data, versionId } });
      }
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "upsertCvLeasing");
  }
}
