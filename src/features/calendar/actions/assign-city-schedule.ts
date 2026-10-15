// src/features/calendar/actions/assign-city-schedule.ts
// Asigna a una ciudad el horario de oficina con el que se ponderan sus tickets (AGENTS.md §2.5).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type AssignCityScheduleInput,
  assignCityScheduleSchema,
} from "../schemas/calendar-schemas";

export async function assignCitySchedule(
  input: AssignCityScheduleInput,
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
      "Solo el administrador del sistema asigna horarios.",
    );
  const parsed = assignCityScheduleSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    await runInTransaction(async (tx) => {
      const before = await tx.city.findUnique({
        where: { id: parsed.data.cityId },
        select: { officeScheduleId: true },
      });
      await tx.city.update({
        where: { id: parsed.data.cityId },
        data: { officeScheduleId: parsed.data.scheduleId },
      });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.ciudad",
        entityId: parsed.data.cityId,
        action: "ASIGNAR_HORARIO",
        before,
        after: { officeScheduleId: parsed.data.scheduleId },
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "assignCitySchedule");
  }
}
