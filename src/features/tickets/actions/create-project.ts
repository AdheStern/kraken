// src/features/tickets/actions/create-project.ts
// Crea un proyecto para agrupar tickets de un cliente (AGENTS.md §2.6).
"use server";

import { type ActionResult, actionError } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { runUserAction } from "@/server/run-user-action";
import { createProjectRecord } from "@/server/tickets/create-project-record";
import {
  type CreateProjectInput,
  createProjectSchema,
} from "../schemas/ticket-work-schemas";

export async function createProject(
  input: CreateProjectInput,
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  return runUserAction("createProject", async (tx, user) => {
    const result = await createProjectRecord(tx, user, parsed.data);
    if (result.ok)
      await recordAudit(tx, {
        actorId: user.id,
        entity: "tickets.proyecto",
        entityId: result.data.projectId,
        action: "CREAR",
        after: parsed.data,
      });
    return result;
  });
}
