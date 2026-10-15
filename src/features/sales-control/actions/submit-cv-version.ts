// src/features/sales-control/actions/submit-cv-version.ts
// Envía una versión en borrador a aprobación: genera solicitudes por área (+GG si supera el umbral).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { systemClock } from "@/server/clock";
import { runInTransaction } from "@/server/db";
import { getDecimalParameter } from "@/server/parameters";
import { submitVersion } from "@/server/sales-control/submit-version";
import { getSessionUser } from "@/server/session";
import {
  type SubmitCvVersionInput,
  submitCvVersionSchema,
} from "../schemas/version-schemas";

// [CONFIRMAR] respaldo del umbral del GG si el parámetro no está cargado (AGENTS.md §14).
const GG_THRESHOLD_FALLBACK_USD = "50000.00";

export async function submitCvVersion(
  input: SubmitCvVersionInput,
): Promise<ActionResult<{ requests: number }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = submitCvVersionSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    const thresholdUsd = await getDecimalParameter(
      "cv.umbral_gg_usd",
      GG_THRESHOLD_FALLBACK_USD,
    );
    return await runInTransaction(async (tx) => {
      const result = await submitVersion(tx, user, parsed.data.versionId, {
        thresholdUsd,
        now: systemClock.now(),
      });
      if (result.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "cv.version",
          entityId: parsed.data.versionId,
          action: "ENVIAR",
          after: { requests: result.data.requests, thresholdUsd },
        });
      return result;
    });
  } catch (error) {
    return toActionError(error, "submitCvVersion");
  }
}
