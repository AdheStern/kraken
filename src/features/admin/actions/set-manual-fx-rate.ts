// src/features/admin/actions/set-manual-fx-rate.ts
// Carga a mano el TC oficial de una fecha cuando la API no respondió (AGENTS.md §2.2, ADR-09). Si el BCB
// publica después ese mismo día, rige el del BCB (find-current-fx-rate.ts).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { systemClock } from "@/server/clock";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type ManualFxRateInput,
  manualFxRateSchema,
} from "../schemas/fx-schemas";

export async function setManualFxRate(
  input: ManualFxRateInput,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "el tipo de cambio");
  if (denied) return denied;
  const parsed = manualFxRateSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { buyRate, sellRate } = parsed.data;
  const effectiveOn = new Date(`${parsed.data.effectiveOn}T00:00:00Z`);
  const data = {
    buyRate,
    sellRate,
    fetchedAt: systemClock.now(),
    createdById: user.id,
  };
  try {
    await prisma.fxRate.upsert({
      where: { effectiveOn_source: { effectiveOn, source: "MANUAL" } },
      create: { effectiveOn, source: "MANUAL", ...data },
      update: data,
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setManualFxRate");
  }
}
