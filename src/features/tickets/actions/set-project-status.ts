// src/features/tickets/actions/set-project-status.ts
// Cierra o reactiva un proyecto (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { setProjectStatusRecord } from "@/server/tickets/set-project-status-record";
import {
  type SetProjectStatusInput,
  setProjectStatusSchema,
} from "../schemas/ticket-work-schemas";

export async function setProjectStatus(
  input: SetProjectStatusInput,
): Promise<ActionResult<SetProjectStatusInput>> {
  const parsed = setProjectStatusSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("setProjectStatus", async (tx, user) => {
    const result = await setProjectStatusRecord(tx, user, parsed.data);
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.proyecto",
        entityId: parsed.data.projectId,
        action: parsed.data.status === "CERRADO" ? "CERRAR" : "REACTIVAR",
        after: parsed.data,
      });
    return result;
  });
}
