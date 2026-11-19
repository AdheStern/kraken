// src/features/sales-control/actions/set-cv-final-price.ts
// Fija o quita el precio final del total de una versión de CV en cualquier estado salvo anulada, sin tocar sus
// líneas ni sus totales calculados (AGENTS.md §2.3, decisión 2026-11-19).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canSetCvFinalPrice } from "@/server/authz/cv-permissions";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma, runInTransaction } from "@/server/db";
import { lockVersion } from "@/server/sales-control/approvers";
import { getSessionUser } from "@/server/session";
import {
  type SetCvFinalPriceInput,
  setCvFinalPriceSchema,
} from "../schemas/final-price-schema";

const FINAL_PRICE_SELECT = {
  status: true,
  totalSaleUsd: true,
  finalSaleUsd: true,
  finalSaleBs: true,
  finalPriceReason: true,
} as const;

export async function setCvFinalPrice(
  input: SetCvFinalPriceInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = setCvFinalPriceSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { versionId, finalSaleUsd, finalSaleBs, reason } = parsed.data;
  if (!canSetCvFinalPrice(user))
    return actionError(
      "FORBIDDEN",
      "Solo Administración y el gerente general fijan el precio final.",
    );
  const visible = await prisma.cvVersion.findFirst({
    where: { id: versionId, cv: scopeCvQuery(user) },
    select: { id: true },
  });
  if (!visible) return actionError("NOT_FOUND", "El CV ya no existe.");

  try {
    return await runInTransaction(async (tx) => {
      await lockVersion(tx, versionId);
      const before = await tx.cvVersion.findUniqueOrThrow({
        where: { id: versionId },
        select: FINAL_PRICE_SELECT,
      });
      if (before.status === "ANULADA")
        return actionError(
          "INVALID_STATE",
          "La versión está anulada; su precio ya no se cambia.",
        );
      const isClearing = finalSaleUsd === null && finalSaleBs === null;
      const after = await tx.cvVersion.update({
        where: { id: versionId },
        data: {
          finalSaleUsd,
          finalSaleBs,
          finalBaseSaleUsd: isClearing ? null : before.totalSaleUsd,
          finalPriceReason: isClearing ? null : reason,
          finalPriceById: isClearing ? null : user.id,
          finalPriceAt: isClearing ? null : new Date(),
        },
        select: FINAL_PRICE_SELECT,
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "cv.version",
        entityId: versionId,
        action: isClearing ? "PRECIO_FINAL_QUITADO" : "PRECIO_FINAL",
        before,
        after: { ...after, reason },
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "setCvFinalPrice");
  }
}
