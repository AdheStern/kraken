// src/features/calendar/actions/deactivate-office-schedule.ts
// Da de baja un horario de oficina que ninguna ciudad usa (borrado lógico de catálogo, AGENTS.md §4).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type DeactivateOfficeScheduleInput,
  deactivateOfficeScheduleSchema,
} from "../schemas/calendar-schemas";

export async function deactivateOfficeSchedule(
  input: DeactivateOfficeScheduleInput,
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
      "Solo el administrador del sistema edita los horarios.",
    );
  const parsed = deactivateOfficeScheduleSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    return await runInTransaction(async (tx) => {
      // REGLA: una ciudad siempre pondera con un horario vigente (§2.5); el que está en uso no se da de baja.
      const cities = await tx.city.findMany({
        where: { officeScheduleId: parsed.data.id },
        select: { name: true },
      });
      if (cities.length > 0)
        return actionError(
          "VALIDATION",
          `Lo usa ${cities.map((c) => c.name).join(", ")}; asígnale otro horario antes de desactivarlo.`,
        );
      await tx.officeSchedule.update({
        where: { id: parsed.data.id },
        data: { isActive: false },
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "deactivateOfficeSchedule");
  }
}
