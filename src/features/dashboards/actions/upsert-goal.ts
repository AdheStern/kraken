// src/features/dashboards/actions/upsert-goal.ts
// Define, cambia o quita la meta mensual de un área (o de la empresa) para un indicador (AGENTS.md §6).
// El GG define todas; el gerente de área, las de sus áreas (§2.9 "Tableros"). Queda en la auditoría (ADR-14).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canEditGoal } from "@/server/authz/dashboard-permissions";
import type { Tx } from "@/server/db";
import { runUserAction } from "@/server/run-user-action";
import {
  type GoalInput,
  type GoalValue,
  goalSchema,
  parseGoalValue,
} from "../schemas/goal-schema";

type Target = Omit<GoalInput, "value">;

export async function upsertGoal(
  input: GoalInput,
): Promise<ActionResult<null>> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success)
    return actionError(
      "VALIDATION",
      "Revisa el área, el indicador y el mes de la meta.",
    );
  const { value: text, ...target } = parsed.data;
  const value = parseGoalValue(target.indicator, text);
  if ("error" in value) return actionError("VALIDATION", value.error);

  return runUserAction("upsertGoal", async (tx, user) => {
    if (!canEditGoal(user, target.areaId))
      return actionError(
        "FORBIDDEN",
        target.areaId
          ? "Solo el GG o el gerente de esa área definen su meta."
          : "Solo el GG define la meta de la empresa.",
      );
    await saveGoal(tx, target, value, user.id);
    return actionOk(null);
  });
}

// TRAMPA: area_id nulo (empresa) no entra en un upsert por clave compuesta; se busca y se decide.
async function saveGoal(
  tx: Tx,
  target: Target,
  value: GoalValue,
  userId: string,
) {
  const before = await tx.goal.findFirst({ where: target });
  const data =
    value.kind === "VACIA"
      ? null
      : value.kind === "USD"
        ? { valueUsd: value.valueUsd, minutes: null }
        : { valueUsd: null, minutes: value.minutes };
  if (!data && !before) return;
  const saved = !data
    ? before && (await tx.goal.delete({ where: { id: before.id } }))
    : before
      ? await tx.goal.update({
          where: { id: before.id },
          data: { ...data, updatedById: userId },
        })
      : await tx.goal.create({
          data: { ...target, ...data, updatedById: userId },
        });
  await recordAudit(tx, {
    actorId: userId,
    entity: "dash.meta",
    entityId: saved?.id ?? "",
    action: !data ? "QUITAR" : before ? "EDITAR" : "CREAR",
    before: before && {
      valueUsd: before.valueUsd?.toFixed(2) ?? null,
      minutes: before.minutes,
    },
    after: data && { ...target, ...data },
  });
}
