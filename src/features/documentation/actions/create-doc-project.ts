// src/features/documentation/actions/create-doc-project.ts
// Crea un proyecto de documentación con su cabecera (AGENTS.md §2.10); lo crea cualquier usuario con rol.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { recordAudit } from "@/server/audit/record-audit";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { toDocProjectData } from "@/server/documentation/doc-project-data";
import { runUserAction } from "@/server/run-user-action";
import {
  type DocProjectInput,
  docProjectSchema,
} from "../schemas/doc-project-schema";

export async function createDocProject(
  input: DocProjectInput,
): Promise<ActionResult<{ projectId: string }>> {
  const parsed = docProjectSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const fields = parsed.data;
  return runUserAction("createDocProject", async (tx, user) => {
    if (!canUseDocumentation(user))
      return actionError("FORBIDDEN", "No tienes acceso a la documentación.");
    const data = await toDocProjectData(tx, fields, null);
    if (!data.ok) return data;
    const project = await tx.docProject.create({
      data: {
        ...data.data,
        createdById: user.id,
        technologies: {
          create: fields.technologyIds.map((technologyId) => ({
            technologyId,
          })),
        },
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      entity: "doc.proyecto",
      entityId: project.id,
      action: "CREAR",
      after: { ...data.data, technologyIds: fields.technologyIds },
    });
    return actionOk({ projectId: project.id });
  });
}
