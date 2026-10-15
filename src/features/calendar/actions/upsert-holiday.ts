// src/features/calendar/actions/upsert-holiday.ts
// Registra un feriado nacional (sin ciudad) o departamental; si ya existía para esa fecha y ámbito, lo
// renombra y lo reactiva (AGENTS.md §2.5, unicidad fecha + ciudad).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { type HolidayInput, holidaySchema } from "../schemas/calendar-schemas";

export async function upsertHoliday(
  input: HolidayInput,
): Promise<ActionResult<{ id: string }>> {
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
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { name, cityId } = parsed.data;
  const date = new Date(`${parsed.data.date}T00:00:00Z`);
  try {
    return await runInTransaction(async (tx) => {
      const found = await tx.holiday.findFirst({ where: { date, cityId } });
      const saved = found
        ? await tx.holiday.update({
            where: { id: found.id },
            data: { name, isActive: true },
          })
        : await tx.holiday.create({ data: { date, name, cityId } });
      await recordAudit(tx, {
        actorId: user.id,
        entity: "core.feriado",
        entityId: saved.id,
        action: found ? "REACTIVAR" : "CREAR",
        after: { date: parsed.data.date, name, cityId },
      });
      return actionOk({ id: saved.id });
    });
  } catch (error) {
    return toActionError(error, "upsertHoliday");
  }
}
