// src/features/calendar/actions/upsert-office-schedule.ts
// Crea o actualiza un horario de oficina con sus franjas por día de la semana (AGENTS.md §2.5).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canManageCalendar } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type OfficeScheduleInput,
  officeScheduleSchema,
} from "../schemas/calendar-schemas";

export async function upsertOfficeSchedule(
  input: OfficeScheduleInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canManageCalendar(user))
    return actionError(
      "FORBIDDEN",
      "Solo el administrador del sistema edita los horarios.",
    );
  const parsed = officeScheduleSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, name, slots } = parsed.data;
  try {
    return await runInTransaction(async (tx) => {
      const sameName = await tx.officeSchedule.findUnique({ where: { name } });
      if (sameName && sameName.id !== id && (sameName.isActive || id))
        return actionError(
          "VALIDATION",
          "Ya existe un horario con ese nombre.",
        );
      // POR QUÉ: un horario dado de baja conserva su nombre (único); crear otro igual lo reactiva.
      const targetId = id ?? sameName?.id ?? null;
      // POR QUÉ: las franjas se reemplazan enteras; el horario es un catálogo, no un libro (§4).
      const saved = targetId
        ? await tx.officeSchedule.update({
            where: { id: targetId },
            data: {
              name,
              isActive: true,
              slots: { deleteMany: {}, create: slots },
            },
          })
        : await tx.officeSchedule.create({
            data: { name, slots: { create: slots } },
          });
      return actionOk({ id: saved.id });
    });
  } catch (error) {
    return toActionError(error, "upsertOfficeSchedule");
  }
}
