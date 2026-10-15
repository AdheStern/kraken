// src/features/hours/actions/adjust-hour-bag.ts
// Suma o resta horas a una bolsa con motivo obligatorio (AGENTS.md §2.9 "Bolsas: ajuste manual").
"use server";

import Decimal from "decimal.js";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { changeBagManually } from "@/server/hours/change-bag-manually";
import { getSessionUser } from "@/server/session";
import {
  type AdjustHourBagInput,
  adjustHourBagSchema,
} from "../schemas/bag-change-schemas";

export async function adjustHourBag(
  input: AdjustHourBagInput,
): Promise<ActionResult<{ balanceMinutes: number }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = adjustHourBagSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { bagId, operation, hours, reason } = parsed.data;
  const minutes = toBagMinutes(new Decimal(hours));
  if (!minutes)
    return actionError(
      "VALIDATION",
      "Las horas deben ser mayores que 0 y dar minutos enteros (p. ej. 1.5 o 1.25).",
    );
  try {
    return await runInTransaction(async (tx) => {
      const result = await changeBagManually(tx, user, {
        kind: "AJUSTE",
        bagId,
        minutes: operation === "SUMAR" ? minutes : 0 - minutes,
        reason,
      });
      if (result.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "horas.bolsa",
          entityId: bagId,
          action: "AJUSTAR",
          after: {
            minutes: operation === "SUMAR" ? minutes : 0 - minutes,
            reason,
            balanceMinutes: result.data.balanceMinutes,
          },
        });
      return result;
    });
  } catch (error) {
    return toActionError(error, "adjustHourBag");
  }
}
