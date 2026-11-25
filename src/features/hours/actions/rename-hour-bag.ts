// src/features/hours/actions/rename-hour-bag.ts
// Pone o quita el nombre visible de una bolsa; no toca su saldo ni su línea del CV (AGENTS.md §2.4, §2.9).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canRenameHourBag } from "@/server/authz/hour-bag-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type RenameHourBagInput,
  renameHourBagSchema,
} from "../schemas/bag-change-schemas";

export async function renameHourBag(
  input: RenameHourBagInput,
): Promise<ActionResult<{ name: string | null }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = renameHourBagSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { bagId, name } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const bag = await tx.hourBag.findUnique({
        where: { id: bagId },
        select: { name: true, areas: { select: { areaId: true } } },
      });
      if (!bag) return actionError("NOT_FOUND", "La bolsa ya no existe.");
      if (!canRenameHourBag(user, { areaIds: bag.areas.map((a) => a.areaId) }))
        return actionError(
          "FORBIDDEN",
          "Solo el gerente o el coordinador del área de la bolsa, o el GG, pueden cambiarle el nombre.",
        );
      if (bag.name === name) return actionOk({ name });
      await tx.hourBag.update({ where: { id: bagId }, data: { name } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "horas.bolsa",
        entityId: bagId,
        action: "RENOMBRAR",
        before: { name: bag.name },
        after: { name },
      });
      return actionOk({ name });
    });
  } catch (error) {
    return toActionError(error, "renameHourBag");
  }
}
