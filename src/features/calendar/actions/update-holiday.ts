// src/features/calendar/actions/update-holiday.ts
// Corrige un feriado: fecha, nombre o dónde rige (AGENTS.md §2.5; unicidad fecha + ciudad).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canManageCalendar } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type UpdateHolidayInput,
  updateHolidaySchema,
} from "../schemas/calendar-schemas";

// LIMITACIÓN: no recalcula consumos ya cerrados; el cambio rige para los cierres que vengan (F3).
export async function updateHoliday(
  input: UpdateHolidayInput,
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
      "Solo el administrador del sistema edita los feriados.",
    );
  const parsed = updateHolidaySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, name, cityId } = parsed.data;
  const date = new Date(`${parsed.data.date}T00:00:00Z`);
  try {
    return await runInTransaction(async (tx) => {
      const clash = await tx.holiday.findFirst({
        where: { date, cityId, id: { not: id } },
      });
      if (clash?.isActive)
        return actionError(
          "VALIDATION",
          "Ya hay un feriado ese día con el mismo alcance.",
        );
      // POR QUÉ: la unicidad (fecha, ciudad) incluye los dados de baja; si el destino choca con uno inactivo,
      // se reactiva ese con el nombre nuevo y se da de baja el editado.
      if (clash) {
        await tx.holiday.update({
          where: { id: clash.id },
          data: { name, isActive: true },
        });
        await tx.holiday.update({ where: { id }, data: { isActive: false } });
        return actionOk({ id: clash.id });
      }
      await tx.holiday.update({ where: { id }, data: { date, name, cityId } });
      return actionOk({ id });
    });
  } catch (error) {
    return toActionError(error, "updateHoliday");
  }
}
