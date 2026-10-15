// src/features/hours/actions/close-hour-bag.ts
// Cierra una bolsa a mano con motivo: un AJUSTE por su saldo la deja CERRADA (AGENTS.md §8, §2.9).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction } from "@/server/db";
import { changeBagManually } from "@/server/hours/change-bag-manually";
import { getSessionUser } from "@/server/session";
import {
  type CloseHourBagInput,
  closeHourBagSchema,
} from "../schemas/bag-change-schemas";

export async function closeHourBag(
  input: CloseHourBagInput,
): Promise<ActionResult<{ balanceMinutes: number }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = closeHourBagSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    return await runInTransaction(async (tx) => {
      const result = await changeBagManually(tx, user, {
        kind: "CIERRE",
        ...parsed.data,
      });
      if (result.ok)
        await recordAudit(tx, {
          actorId: user.id,
          entity: "horas.bolsa",
          entityId: parsed.data.bagId,
          action: "CERRAR",
          after: { reason: parsed.data.reason },
        });
      return result;
    });
  } catch (error) {
    return toActionError(error, "closeHourBag");
  }
}
