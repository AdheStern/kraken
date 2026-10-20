// src/features/sales-control/actions/upsert-cv-lines.ts
// Guarda lotes y líneas de una versión en BORRADOR. Recalcula precio y totales en el servidor con el
// dominio (nunca confía en el navegador) y actualiza los totales de la versión en la misma transacción.
"use server";

import Decimal from "decimal.js";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { replaceVersionLines } from "@/server/sales-control/replace-version-lines";
import { getSessionUser } from "@/server/session";
import { prepareLineRecords } from "../line-records";
import {
  type UpsertCvLinesInput,
  upsertCvLinesSchema,
} from "../schemas/cv-lines-schema";

export async function upsertCvLines(
  input: UpsertCvLinesInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = upsertCvLinesSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { versionId, groups, lines } = parsed.data;

  const version = await prisma.cvVersion.findUnique({
    where: { id: versionId },
    select: {
      cvId: true,
      status: true,
      costFxRate: true,
      saleFxRate: true,
      cv: { select: { isOpeningBalance: true, customerId: true } },
    },
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

  // REGLA: los Bs y el factor se calculan con el TC guardado en la versión, no con el que envía el navegador.
  const fx = {
    costFxRate: new Decimal(version.costFxRate.toString()),
    saleFxRate: new Decimal(version.saleFxRate.toString()),
  };
  const hoursUnits = await prisma.unit.findMany({
    where: { isHours: true },
    select: { id: true },
  });
  const context = {
    hoursUnitIds: new Set(hoursUnits.map((unit) => unit.id)),
    isOpeningBalance: version.cv.isOpeningBalance,
  };
  const prepared = prepareLineRecords(groups, lines, fx, context);
  if (!prepared.ok) return actionError("VALIDATION", prepared.message);
  // REGLA: una bolsa por proyecto solo usa proyectos activos del cliente del CV (§2.4 alcance).
  const projectIds = lines.flatMap((l) =>
    l.hourBag?.scope === "PROYECTO" && l.hourBag.projectId
      ? [l.hourBag.projectId]
      : [],
  );
  const ownProjects = await prisma.project.count({
    where: {
      id: { in: projectIds },
      customerId: version.cv.customerId,
      status: "ACTIVO",
    },
  });
  if (ownProjects !== new Set(projectIds).size)
    return actionError(
      "VALIDATION",
      "El proyecto de una bolsa no es de este cliente o ya está cerrado.",
    );

  try {
    await runInTransaction((tx) =>
      replaceVersionLines(
        tx,
        versionId,
        groups,
        prepared.records,
        prepared.totals,
      ),
    );
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "upsertCvLines");
  }
}
