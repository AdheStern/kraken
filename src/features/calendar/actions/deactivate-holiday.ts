// src/features/calendar/actions/deactivate-holiday.ts
// Da de baja un feriado (borrado lógico de catálogo, AGENTS.md §4); deja de contar como fuera de horario.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type DeactivateHolidayInput,
  deactivateHolidaySchema,
} from "../schemas/calendar-schemas";

// LIMITACIÓN: no recalcula consumos ya cerrados; la baja rige para los cierres que vengan (F3).
export async function deactivateHoliday(
  input: DeactivateHolidayInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canManageSystem(user))
    return actionError(
      "FORBIDDEN",
      "Solo el administrador del sistema edita los feriados.",
    );
  const parsed = deactivateHolidaySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    await runInTransaction(async (tx) => {
      const holiday = await tx.holiday.update({
        where: { id: parsed.data.id },
        data: { isActive: false },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.feriado",
        entityId: holiday.id,
        action: "BAJA",
        before: {
          date: holiday.date,
          name: holiday.name,
          cityId: holiday.cityId,
        },
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "deactivateHoliday");
  }
}
